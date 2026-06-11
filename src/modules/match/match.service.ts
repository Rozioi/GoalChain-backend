import { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import { MATCH } from "../../config/constants";
import { generateBotTeam } from "./bot.generator";
import { formatMatchEvents } from "./match-completion.service";
import { getTeamForMatch, simulateMatch } from "./match-team.service";
import { handleMatchCompletion } from "./match-completion.service";
import { startMatchmaking, cancelMatchmaking } from "./matchmaking.service";
import { startInstantBotMatch } from "./match-live.service";

export { startMatchmaking as playFriendlyMatch };
export { cancelMatchmaking };

export async function playBotMatch(app: FastifyInstance, userId: string) {
  const user = await app.prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (user.dailyMatchesResetAt < today) {
    await app.prisma.user.update({
      where: { id: userId },
      data: { dailyMatchesPlayed: 0, dailyMatchesResetAt: new Date() },
    });
  } else if (user.dailyMatchesPlayed >= MATCH.DAILY_FRIENDLY_LIMIT) {
    throw new Error(`Daily match limit reached (${MATCH.DAILY_FRIENDLY_LIMIT})`);
  }

  const myTeam = await app.prisma.team.findFirst({
    where: { userId, isEvent: false },
  });
  if (!myTeam) throw new Error("No team found");

  const botResult = await generateBotTeam(app, myTeam.rating);
  const { match, result } = await startInstantBotMatch(
    app,
    userId,
    myTeam.id,
    botResult.team.id,
  );

  await app.prisma.user.update({
    where: { id: userId },
    data: { dailyMatchesPlayed: { increment: 1 } },
  });

  return {
    match,
    result: {
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      winner: result.winner,
      events: formatMatchEvents(
        result.events.map((e) => ({
          ...e,
          playerId: e.playerId ?? null,
          playerName: e.playerName ?? null,
        })),
      ),
    },
    rewards: {
      coins:
        result.winner === "home"
          ? MATCH.REWARDS.WIN_COINS
          : MATCH.REWARDS.LOSS_COINS,
      exp:
        result.winner === "home"
          ? MATCH.REWARDS.WIN_EXP
          : MATCH.REWARDS.LOSS_EXP,
    },
    preloaderData: {
      homePlayer: { id: user.id, name: user.clubName, points: user.points },
      awayPlayer: { id: "bot", name: "Bot", points: user.points + 10 },
    },
    isBot: true,
  };
}

export async function getMatchById(app: FastifyInstance, matchId: string) {
  const match = await app.prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: true,
      awayTeam: true,
      homeUser: true,
      awayUser: true,
      events: { orderBy: { minute: "asc" } },
    },
  });

  if (!match) return null;

  let result = null;
  if (match.status === "COMPLETED" || match.status === "IN_PROGRESS") {
    result = {
      homeScore: match.homeScore ?? 0,
      awayScore: match.awayScore ?? 0,
      winner:
        (match.homeScore ?? 0) > (match.awayScore ?? 0)
          ? "home"
          : (match.awayScore ?? 0) > (match.homeScore ?? 0)
            ? "away"
            : "draw",
      currentMinute: match.currentMinute,
      events: formatMatchEvents(match.events),
    };
  }

  return { match, result };
}

export async function getMatchHistory(
  app: FastifyInstance,
  userId: string,
  limit = 20,
) {
  return app.prisma.match.findMany({
    where: {
      OR: [{ homeUserId: userId }, { awayUserId: userId }],
      status: "COMPLETED",
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      homeTeam: true,
      awayTeam: true,
      events: { orderBy: { minute: "asc" } },
    },
  });
}

export { getTeamForMatch, handleMatchCompletion, simulateMatch };
