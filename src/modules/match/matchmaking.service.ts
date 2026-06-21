import { FastifyInstance } from "fastify";
import { MATCH } from "../../config/constants";
import { emitToUser, matchRoom, userRoom } from "../../ws/socket.emitter";
import { ServerEvent } from "../../ws/types";
import { createPvPMatch, startInstantBotMatch } from "./match-live.service";
import { generateBotTeam } from "./bot.generator";

async function assertDailyLimit(app: FastifyInstance, userId: string) {
  const user = await app.prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (user.dailyMatchesResetAt < today) {
    await app.prisma.user.update({
      where: { id: userId },
      data: { dailyMatchesPlayed: 0, dailyMatchesResetAt: new Date() },
    });
    return;
  }

  if (user.dailyMatchesPlayed >= MATCH.DAILY_FRIENDLY_LIMIT) {
    throw new Error(
      `Daily match limit reached (${MATCH.DAILY_FRIENDLY_LIMIT})`,
    );
  }
}

async function incrementDailyMatch(app: FastifyInstance, userIds: string[]) {
  await app.prisma.user.updateMany({
    where: { id: { in: userIds } },
    data: { dailyMatchesPlayed: { increment: 1 } },
  });
}

export async function startMatchmaking(app: FastifyInstance, userId: string) {
  await assertDailyLimit(app, userId);

  const myTeam = await app.prisma.team.findFirst({
    where: { userId, isEvent: false },
  });
  if (!myTeam) throw new Error("No team found. Complete the draft first.");

  const user = await app.prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const existing = await app.prisma.matchmakingQueue.findFirst({
    where: {
      userId,
      status: "SEARCHING",
      expiresAt: { gt: new Date() },
    },
  });
  if (existing) {
    return { queueId: existing.id, status: "SEARCHING" };
  }

  const expiresAt = new Date(Date.now() + MATCH.MATCHMAKING_TIMEOUT_MS);
  const ratingRange = MATCH.MATCHMAKING_POINTS_RANGE;
  console.log(user.points - ratingRange, user.points + ratingRange);
  const opponent = await app.prisma.matchmakingQueue.findFirst({
    where: {
      status: "SEARCHING",
      userId: { not: userId },
      expiresAt: { gt: new Date() },
      // pointsSnapshot: {
      //   gte: user.points - ratingRange,
      //   lte: user.points + ratingRange,
      // },
    },
    orderBy: { createdAt: "asc" },
  });

  if (opponent) {
    const claimed = await app.prisma.matchmakingQueue.updateMany({
      where: { id: opponent.id, status: "SEARCHING" },
      data: { status: "MATCHED" },
    });

    if (claimed.count > 0) {
      const opponentTeam = await app.prisma.team.findUnique({
        where: { id: opponent.teamId },
      });
      if (!opponentTeam) throw new Error("Opponent team not found");

      const match = await createPvPMatch(app, {
        homeUserId: opponent.userId,
        awayUserId: userId,
        homeTeamId: opponent.teamId,
        awayTeamId: myTeam.id,
        type: "FRIENDLY",
      });

      await app.prisma.matchmakingQueue.updateMany({
        where: { id: { in: [opponent.id] } },
        data: { status: "MATCHED", matchId: match.id },
      });

      await app.prisma.matchmakingQueue.create({
        data: {
          userId,
          teamId: myTeam.id,
          pointsSnapshot: user.points,
          status: "MATCHED",
          matchId: match.id,
          expiresAt,
        },
      });

      const opponentUser = await app.prisma.user.findUnique({
        where: { id: opponent.userId },
        select: { id: true, clubName: true, points: true },
      });

      emitToUser(opponent.userId, ServerEvent.MATCH_FOUND, {
        matchId: match.id,
        opponent: { id: userId, clubName: user.clubName, points: user.points },
        isBot: false,
      });

      emitToUser(userId, ServerEvent.MATCH_FOUND, {
        matchId: match.id,
        opponent: opponentUser,
        isBot: false,
      });

      return { matchId: match.id, status: "MATCHED", isBot: false };
    }
  }

  const queueEntry = await app.prisma.matchmakingQueue.create({
    data: {
      userId,
      teamId: myTeam.id,
      pointsSnapshot: user.points,
      status: "SEARCHING",
      expiresAt,
    },
  });

  emitToUser(userId, ServerEvent.MATCHMAKING_STARTED, {
    queueId: queueEntry.id,
    expiresAt: expiresAt.toISOString(),
  });

  scheduleMatchmakingTimeout(app, queueEntry.id, userId);

  return { queueId: queueEntry.id, status: "SEARCHING" };
}

const timeoutTimers = new Map<string, NodeJS.Timeout>();

function scheduleMatchmakingTimeout(
  app: FastifyInstance,
  queueId: string,
  userId: string,
) {
  if (timeoutTimers.has(queueId)) clearTimeout(timeoutTimers.get(queueId)!);

  const timer = setTimeout(async () => {
    timeoutTimers.delete(queueId);
    await handleMatchmakingTimeout(app, queueId, userId);
  }, MATCH.MATCHMAKING_TIMEOUT_MS);

  timeoutTimers.set(queueId, timer);
}

async function handleMatchmakingTimeout(
  app: FastifyInstance,
  queueId: string,
  userId: string,
) {
  const entry = await app.prisma.matchmakingQueue.findUnique({
    where: { id: queueId },
  });
  if (!entry || entry.status !== "SEARCHING") return;

  await app.prisma.matchmakingQueue.update({
    where: { id: queueId },
    data: { status: "EXPIRED" },
  });

  emitToUser(userId, ServerEvent.MATCHMAKING_EXPIRED, { queueId });

  try {
    const botResult = await playBotMatchFallback(app, userId);
    emitToUser(userId, ServerEvent.MATCH_FOUND, {
      matchId: botResult.match.id,
      opponent: { id: "bot", clubName: "Bot", points: 0 },
      isBot: true,
    });
  } catch (err) {
    app.log.error(
      { err, userId },
      "Bot fallback failed after matchmaking timeout",
    );
  }
}

async function playBotMatchFallback(app: FastifyInstance, userId: string) {
  const myTeam = await app.prisma.team.findFirst({
    where: { userId, isEvent: false },
  });
  if (!myTeam) throw new Error("No team found");

  const botResult = await generateBotTeam(app, myTeam.rating);
  const result = await startInstantBotMatch(
    app,
    userId,
    myTeam.id,
    botResult.team.id,
  );

  await incrementDailyMatch(app, [userId]);
  return result;
}

export async function cancelMatchmaking(app: FastifyInstance, userId: string) {
  const entry = await app.prisma.matchmakingQueue.findFirst({
    where: {
      userId,
      status: "SEARCHING",
      expiresAt: { gt: new Date() },
    },
  });

  if (!entry) {
    return { success: false, message: "No active matchmaking found" };
  }

  if (timeoutTimers.has(entry.id)) {
    clearTimeout(timeoutTimers.get(entry.id)!);
    timeoutTimers.delete(entry.id);
  }

  await app.prisma.matchmakingQueue.update({
    where: { id: entry.id },
    data: { status: "CANCELLED" },
  });

  emitToUser(userId, ServerEvent.MATCHMAKING_CANCELLED, { queueId: entry.id });
  return { success: true };
}

export async function expireStaleMatchmaking(app: FastifyInstance) {
  const stale = await app.prisma.matchmakingQueue.findMany({
    where: { status: "SEARCHING", expiresAt: { lte: new Date() } },
  });

  for (const entry of stale) {
    await handleMatchmakingTimeout(app, entry.id, entry.userId);
  }

  return stale.length;
}

export async function onMatchmakingMatched(
  app: FastifyInstance,
  homeUserId: string,
  awayUserId: string,
  matchId: string,
) {
  await incrementDailyMatch(app, [homeUserId, awayUserId]);
}
