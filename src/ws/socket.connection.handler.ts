import { FastifyInstance } from "fastify";
import { Server } from "socket.io";
import { AuthenticatedSocket } from "./socket.auth.middleware";
import {
  emitToMatch,
  matchRoom,
  userRoom,
} from "./socket.emitter";
import { ClientEvent, ServerEvent } from "./types";
import {
  updateLiveTactics,
} from "../modules/match/match-live.service";
import {
  playerJoinsMatchRoom,
  playerReadyForMatch,
  playerDisconnectedFromMatch,
  buildMatchStateSync,
} from "../modules/match/match-room-manager";

const connectedUsers = new Map<string, Set<string>>(); // userId → socketIds

export function registerConnectionHandlers(app: FastifyInstance, io: Server) {
  io.on("connection", (rawSocket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const { userId } = socket.data.user;

    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId)!.add(socket.id);

    socket.join(userRoom(userId));
    socket.emit(ServerEvent.CONNECTED, { userId });

    restoreUserRooms(app, socket, userId).catch((err) => {
      app.log.error({ err, userId }, "Failed to restore user rooms");
    });

    socket.on(ClientEvent.PING, () => {
      socket.emit(ServerEvent.PONG, { ts: Date.now() });
    });

    // ── New: Join match room (for invite/making challenges) ──
    socket.on(ClientEvent.JOIN_MATCH, async (payload: { matchId: string }) => {
      try {
        // Join the WS room for this match
        socket.join(matchRoom(payload.matchId));

        // Register player in the in-memory room manager
        await playerJoinsMatchRoom(app, payload.matchId, userId);
      } catch (err: any) {
        socket.emit(ServerEvent.ERROR, { message: err.message });
      }
    });

    // ── New: Player ready for match ──
    socket.on(ClientEvent.MATCH_READY, async (payload: { matchId: string }) => {
      try {
        await playerReadyForMatch(app, payload.matchId, userId);
      } catch (err: any) {
        socket.emit(ServerEvent.ERROR, { message: err.message });
      }
    });

    socket.on(
      ClientEvent.TACTICS_UPDATE,
      async (payload: {
        matchId: string;
        pressingType?: "SOFT" | "MEDIUM" | "INTENSIVE";
        substitutions?: { outId: string; inId: string }[];
      }) => {
        try {
          await updateLiveTactics(app, payload.matchId, userId, {
            pressingType: payload.pressingType,
            substitutions: payload.substitutions,
          });
        } catch (err: any) {
          socket.emit(ServerEvent.ERROR, { message: err.message });
        }
      },
    );

    socket.on("disconnect", async () => {
      const sockets = connectedUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          connectedUsers.delete(userId);
          await handleUserDisconnect(app, userId);
        }
      }
    });
  });
}

async function restoreUserRooms(
  app: FastifyInstance,
  socket: AuthenticatedSocket,
  userId: string,
) {
  const activeMatch = await app.prisma.match.findFirst({
    where: {
      OR: [{ homeUserId: userId }, { awayUserId: userId }],
      status: { in: ["READY", "IN_PROGRESS"] },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (activeMatch) {
    socket.join(matchRoom(activeMatch.id));

    // If match is in progress, send full state sync (current minute, past events)
    if (activeMatch.status === "IN_PROGRESS") {
      const syncState = await buildMatchStateSync(app, activeMatch.id, userId);
      if (syncState) {
        socket.emit(ServerEvent.MATCH_STATE_SYNC, syncState);
      }
    }

    socket.emit(ServerEvent.PLAYER_RECONNECTED, { matchId: activeMatch.id });

    const opponentId =
      activeMatch.homeUserId === userId
        ? activeMatch.awayUserId
        : activeMatch.homeUserId;

    if (opponentId) {
      emitToMatch(activeMatch.id, ServerEvent.PLAYER_RECONNECTED, {
        matchId: activeMatch.id,
        userId,
      });
    }
  }

  const pendingInvites = await app.prisma.matchInvite.findMany({
    where: {
      OR: [{ recipientId: userId }, { senderId: userId }],
      status: "PENDING",
      expiresAt: { gt: new Date() },
    },
  });

  for (const invite of pendingInvites) {
      const { buildTelegramAppUrl } = await import("../utils/telegram-link");
      const inviteLink = buildTelegramAppUrl(`match_${invite.id}`);

    if (invite.recipientId === userId) {
      const sender = await app.prisma.user.findUnique({
        where: { id: invite.senderId },
        select: { id: true, clubName: true, points: true },
      });
      socket.emit(ServerEvent.INVITE_RECEIVED, {
        inviteId: invite.id,
        type: invite.type,
        sender,
        expiresAt: invite.expiresAt.toISOString(),
        inviteLink,
      });
    }

    if (invite.senderId === userId && invite.type === "FRIEND") {
      socket.emit(ServerEvent.INVITE_SENT, {
        inviteId: invite.id,
        inviteLink,
        expiresAt: invite.expiresAt.toISOString(),
        delivery: "restored",
      });
    }
  }
}

async function handleUserDisconnect(app: FastifyInstance, userId: string) {
  const activeMatch = await app.prisma.match.findFirst({
    where: {
      OR: [{ homeUserId: userId }, { awayUserId: userId }],
      status: "IN_PROGRESS",
    },
  });

  if (activeMatch) {
    emitToMatch(activeMatch.id, ServerEvent.PLAYER_DISCONNECTED, {
      matchId: activeMatch.id,
      userId,
    });

    // Notify the in-memory room manager
    const { playerDisconnectedFromMatch } = await import("../modules/match/match-room-manager");
    playerDisconnectedFromMatch(activeMatch.id, userId);
  }
}

export function isUserOnline(userId: string): boolean {
  return connectedUsers.has(userId) && connectedUsers.get(userId)!.size > 0;
}
