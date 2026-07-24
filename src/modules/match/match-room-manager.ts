import { FastifyInstance } from "fastify";
import {
  emitToMatch,
  emitToUser,
  matchRoom,
  userRoom,
} from "../../ws/socket.emitter";
import { ServerEvent } from "../../ws/types";
import { startLiveMatch } from "./match-live.service";

// ─── Types ───────────────────────────────────────────────────────
export enum MatchRoomStatus {
  CREATED = "CREATED",
  WAITING_FOR_PLAYERS = "WAITING_FOR_PLAYERS",
  READY = "READY",
  IN_PROGRESS = "IN_PROGRESS",
  FINISHED = "FINISHED",
}

interface PlayerState {
  userId: string;
  ready: boolean;
  connected: boolean;
}

interface MatchRoom {
  matchId: string;
  status: MatchRoomStatus;
  home: PlayerState;
  away: PlayerState | null; // null until second player joins
  startedAt: number | null; // unix ms
  readyTimers: Map<string, NodeJS.Timeout>; // userId -> timeout
  roomTimeout: NodeJS.Timeout | null;
}

// ─── Store ───────────────────────────────────────────────────────
const rooms = new Map<string, MatchRoom>();

// ─── Max time to wait for both players to ready up after match created ──
const READY_TIMEOUT_MS = 30_000;

// ─── Public API ──────────────────────────────────────────────────

/**
 * Create a match room in WAITING state.
 * Called from createPvPMatch / createMatchFromInvite.
 */
export function createMatchRoom(
  matchId: string,
  homeUserId: string,
  awayUserId: string | null,
) {
  const room: MatchRoom = {
    matchId,
    status: MatchRoomStatus.CREATED,
    home: { userId: homeUserId, ready: false, connected: false },
    away: awayUserId
      ? { userId: awayUserId, ready: false, connected: false }
      : null,
    startedAt: null,
    readyTimers: new Map(),
    roomTimeout: null,
  };

  rooms.set(matchId, room);
  return room;
}

/**
 * Remove a room from memory.
 */
export function destroyMatchRoom(matchId: string) {
  const room = rooms.get(matchId);
  if (!room) return;

  // Clear all pending timers
  for (const timer of room.readyTimers.values()) {
    clearTimeout(timer);
  }
  room.readyTimers.clear();

  if (room.roomTimeout) {
    clearTimeout(room.roomTimeout);
    room.roomTimeout = null;
  }

  rooms.delete(matchId);
}

/**
 * Player joins the match room (called from WS handler).
 * Emits PLAYER_JOINED to the other player.
 */
export async function playerJoinsMatchRoom(
  app: FastifyInstance,
  matchId: string,
  userId: string,
) {
  const room = rooms.get(matchId);

  // If room doesn't exist in memory (e.g. server restart), create from DB
  if (!room) {
    const match = await app.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new Error("Match not found");
    createMatchRoom(matchId, match.homeUserId!, match.awayUserId ?? null);
  }

  const r = rooms.get(matchId)!;

  // Mark this player as connected
  if (r.home.userId === userId) {
    r.home.connected = true;
  } else if (r.away && r.away.userId === userId) {
    r.away.connected = true;
  } else if (!r.away) {
    // Second player joins — assign as away
    r.away = { userId, ready: false, connected: true };
  } else {
    throw new Error("You are not part of this match");
  }

  // Start the 30-second ready timeout for the player who just joined
  startPlayerReadyTimer(app, matchId, userId);

  // If room was WAITING, transition to READY (both players present)
  if (r.status === MatchRoomStatus.CREATED || r.status === MatchRoomStatus.WAITING_FOR_PLAYERS) {
    if (r.away) {
      r.status = MatchRoomStatus.READY;

      // Notify the other player
      const otherId = r.home.userId === userId ? r.away.userId : r.home.userId;
      if (otherId) {
        emitToUser(otherId, ServerEvent.PLAYER_JOINED, {
          matchId,
          userId,
          bothConnected: true,
        });
      }

      emitToUser(userId, ServerEvent.PLAYER_JOINED, {
        matchId,
        userId: otherId,
        bothConnected: true,
      });

      // Cancel room-level timeout (if any)
      if (r.roomTimeout) {
        clearTimeout(r.roomTimeout);
        r.roomTimeout = null;
      }
    } else {
      r.status = MatchRoomStatus.WAITING_FOR_PLAYERS;

      // Set room-level timeout: if opponent never comes, cancel match
      r.roomTimeout = setTimeout(() => {
        cancelMatchRoom(app, matchId, "Opponent did not join in time");
      }, READY_TIMEOUT_MS * 2);
    }
  }
}

/**
 * Player marks themselves as ready.
 * When both are ready — transitions to IN_PROGRESS and starts match events.
 */
export async function playerReadyForMatch(
  app: FastifyInstance,
  matchId: string,
  userId: string,
  walletAddress?: string,
) {
  const room = rooms.get(matchId);
  if (!room) throw new Error("Match room not found");
  if (room.status !== MatchRoomStatus.READY) {
    throw new Error("Match is not in ready state");
  }

  // Validate that this user belongs to the match
  const isHome = room.home.userId === userId;
  const isAway = room.away?.userId === userId;
  if (!isHome && !isAway) throw new Error("Not your match");

  // Mark player as ready
  if (isHome) room.home.ready = true;
  if (isAway && room.away) room.away.ready = true;

  // Cancel individual timer
  cancelPlayerReadyTimer(matchId, userId);

  // Notify match room about ready status
  const homeReady = room.home.ready;
  const awayReady = room.away?.ready ?? false;

  emitToMatch(matchId, ServerEvent.MATCH_READY, {
    matchId,
    homeReady,
    awayReady,
  });

  // Persist to DB
  const updateData = isHome
    ? { homeReady: true }
    : { awayReady: true };
  await app.prisma.match.update({
    where: { id: matchId },
    data: updateData,
  });

  // If both ready — start the match
  if (homeReady && awayReady) {
    room.status = MatchRoomStatus.IN_PROGRESS;
    room.startedAt = Date.now();

    // Persist IN_PROGRESS + startedAt to DB
    await app.prisma.match.update({
      where: { id: matchId },
      data: {
        status: "IN_PROGRESS",
        startedAt: new Date(room.startedAt),
        currentMinute: 0,
        homeScore: 0,
        awayScore: 0,
      },
    });

    // Emit MATCH_STARTED with startedAt for calculating in-game time
    emitToMatch(matchId, ServerEvent.MATCH_STARTED, {
      matchId,
      startedAt: room.startedAt,
    });

    // Start live event stream
    await startLiveMatch(app, matchId);
  }
}

/**
 * Called when a player disconnects.
 */
export function playerDisconnectedFromMatch(matchId: string, userId: string) {
  const room = rooms.get(matchId);
  if (!room) return;

  if (room.home.userId === userId) {
    room.home.connected = false;
  } else if (room.away && room.away.userId === userId) {
    room.away.connected = false;
  }

  // If match hasn't started yet, give them time to reconnect
  if (room.status === MatchRoomStatus.READY) {
    startPlayerReadyTimer(null as any, matchId, userId);
  }
}

/**
 * Build full match state for reconnecting client.
 * Returns current minute, past events, scores, and room state.
 */
export async function buildMatchStateSync(
  app: FastifyInstance,
  matchId: string,
  userId: string,
) {
  const room = rooms.get(matchId);

  // Compute current real match minute if match is live
  let currentMinute = 0;
  if (room?.status === MatchRoomStatus.IN_PROGRESS && room.startedAt) {
    const elapsed = Date.now() - room.startedAt;
    const msPerMinute = 1000; // 1 sec per match minute from constants
    currentMinute = Math.min(90, Math.floor(elapsed / msPerMinute));
  }

  // Fetch events from DB
  const match = await app.prisma.match.findUnique({
    where: { id: matchId },
    include: {
      events: { orderBy: { minute: "asc" } },
    },
  });

  if (!match) return null;

  // Filter to only events that have already happened
  const pastEvents = match.events.filter((e) => e.minute <= currentMinute);

  return {
    matchId,
    status: match.status,
    currentMinute,
    homeScore: match.homeScore ?? 0,
    awayScore: match.awayScore ?? 0,
    startedAt: room?.startedAt ?? match.startedAt?.getTime() ?? null,
    events: pastEvents.map((e) => ({
      minute: e.minute,
      type: e.type,
      team: e.team,
      playerId: e.playerId,
      playerName: e.playerName,
      description: e.description,
    })),
    roomStatus: room?.status ?? null,
    homeReady: room?.home.ready ?? false,
    awayReady: room?.away?.ready ?? false,
  };
}

/**
 * Cancel a match room — notify both players and clean up.
 */
export async function cancelMatchRoom(
  app: FastifyInstance,
  matchId: string,
  reason: string,
) {
  const room = rooms.get(matchId);
  if (!room) return;

  // Notify players
  emitToMatch(matchId, ServerEvent.MATCH_CANCELLED, { matchId, reason });

  // Update DB
  await app.prisma.match.update({
    where: { id: matchId },
    data: { status: "CANCELLED" },
  });

  destroyMatchRoom(matchId);
}

/**
 * Check if a match room exists in memory.
 */
export function getMatchRoom(matchId: string): MatchRoom | undefined {
  return rooms.get(matchId);
}

// ─── Helpers ─────────────────────────────────────────────────────

function startPlayerReadyTimer(
  app: FastifyInstance,
  matchId: string,
  userId: string,
) {
  cancelPlayerReadyTimer(matchId, userId);

  const timer = setTimeout(async () => {
    const room = rooms.get(matchId);
    if (!room) return;
    if (room.status === MatchRoomStatus.READY) {
      // Player didn't ready up in time — cancel match for them
      const isHome = room.home.userId === userId;
      const isAway = room.away?.userId === userId;

      app.log.warn({ matchId, userId }, "Player ready timeout — cancelling match");

      emitToMatch(matchId, ServerEvent.MATCH_CANCELLED, {
        matchId,
        reason: `${isHome ? "Home" : "Away"} player did not confirm readiness in time`,
      });

      await app.prisma.match.update({
        where: { id: matchId },
        data: { status: "CANCELLED" },
      });

      destroyMatchRoom(matchId);
    }
  }, READY_TIMEOUT_MS);

  const matchedRoom = rooms.get(matchId);
  if (matchedRoom) {
    matchedRoom.readyTimers.set(userId, timer);
  }
}

function cancelPlayerReadyTimer(matchId: string, userId: string) {
  const room = rooms.get(matchId);
  if (!room) return;

  const timer = room.readyTimers.get(userId);
  if (timer) {
    clearTimeout(timer);
    room.readyTimers.delete(userId);
  }
}
