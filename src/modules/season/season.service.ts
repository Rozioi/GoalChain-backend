import { FastifyInstance } from "fastify";
import { SEASON } from "../../config/constants";

export async function getCurrentSeason(app: FastifyInstance) {
  return app.prisma.season.findFirst({
    where: { status: { in: ["ACTIVE", "PLAYOFFS"] } },
    select: {
      id: true,
      name: true,
      division: true,
      status: true,
      startDate: true,
      endDate: true,
      standings: {
        orderBy: [{ points: "desc" }, { goalsFor: "desc" }],
        select: {
          id: true,
          played: true,
          wins: true,
          draws: true,
          losses: true,
          goalsFor: true,
          goalsAgainst: true,
          points: true,
          team: {
            select: {
              id: true,
              name: true,
              rating: true,
              userId: true,
              user: {
                select: {
                  username: true,
                  firstName: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function getSeasonStandings(
  app: FastifyInstance,
  seasonId: string,
) {
  return app.prisma.seasonStanding.findMany({
    where: { seasonId },
    include: {
      team: {
        include: {
          user: {
            select: {
              username: true,
              firstName: true,
            },
          },
        },
      },
    },
    orderBy: [{ points: "desc" }, { goalsFor: "desc" }],
  });
}

export async function registerForSeason(app: FastifyInstance, userId: string) {
  const season = await app.prisma.season.findFirst({
    where: { status: "UPCOMING" },
  });

  if (!season) throw new Error("No upcoming season");

  const team = await app.prisma.team.findFirst({
    where: { userId, isEvent: false },
  });

  if (!team) throw new Error("No team. Complete draft first.");

  const existing = await app.prisma.seasonStanding.findUnique({
    where: { seasonId_teamId: { seasonId: season.id, teamId: team.id } },
  });
  if (existing) throw new Error("Already registered for this season");

  const standing = await app.prisma.seasonStanding.create({
    data: {
      seasonId: season.id,
      teamId: team.id,
    },
  });

  return { season, standing };
}

export async function updateStandings(
  app: FastifyInstance,
  seasonId: string,
  teamId: string,
  goalsFor: number,
  goalsAgainst: number,
  result: "win" | "draw" | "loss",
) {
  const update: any = {
    played: { increment: 1 },
    goalsFor: { increment: goalsFor },
    goalsAgainst: { increment: goalsAgainst },
  };

  if (result === "win") {
    update.wins = { increment: 1 };
    update.points = { increment: 3 };
  } else if (result === "draw") {
    update.draws = { increment: 1 };
    update.points = { increment: 1 };
  } else {
    update.losses = { increment: 1 };
  }

  return app.prisma.seasonStanding.update({
    where: { seasonId_teamId: { seasonId, teamId } },
    data: update,
  });
}

export async function createSeason(
  app: FastifyInstance,
  name: string,
  division: number,
) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + SEASON.DURATION_WEEKS * 7);

  return app.prisma.season.create({
    data: {
      name,
      division,
      status: "UPCOMING",
      startDate,
      endDate,
    },
  });
}
export async function checkAndEndExpiredSeasons(app: FastifyInstance) {
  const now = new Date();
  const expiredSeasons = await app.prisma.season.findMany({
    where: {
      endDate: { lte: now },
      status: { not: "COMPLETED" },
    },
  });

  for (const season of expiredSeasons) {
    await endSeason(app, season.id);
    app.log.info(`Season ${season.id} has been automatically completed.`);
  }
}

export async function endSeason(app: FastifyInstance, seasonId: string) {
  const season = await app.prisma.season.findUnique({
    where: { id: seasonId },
    include: {
      standings: {
        orderBy: [{ points: "desc" }, { goalsFor: "desc" }],
        take: 3,
        include: { team: true },
      },
    },
  });

  if (!season) throw new Error("Season not found");
  if (season.status === "COMPLETED")
    throw new Error("Season already completed");

  const rewards = [
    SEASON.REWARDS.FIRST_PLACE,
    SEASON.REWARDS.SECOND_PLACE,
    SEASON.REWARDS.THIRD_PLACE,
  ];

  const titles = ["Champion", "Runner-up", "Third Place"];

  for (let i = 0; i < season.standings.length; i++) {
    const standing = season.standings[i];
    const reward = rewards[i];
    const title = titles[i];

    if (standing && reward) {
      await app.prisma.user.update({
        where: { id: standing.team.userId },
        data: { coins: { increment: reward } },
      });
    }
  }

  return app.prisma.season.update({
    where: { id: seasonId },
    data: { status: "COMPLETED" },
  });
}
export async function playSeasonMatch(app: FastifyInstance, userId: string) {
  const team = await app.prisma.team.findFirst({
    where: { userId, isEvent: false },
  });
  if (!team) throw new Error("No team found");

  const standing = await app.prisma.seasonStanding.findFirst({
    where: { teamId: team.id, season: { status: "ACTIVE" } },
    include: { season: true },
  });

  if (!standing) throw new Error("No active season membership found");
  const seasonId = standing.seasonId;

  const opponentStanding = await app.prisma.seasonStanding.findFirst({
    where: {
      seasonId,
      teamId: { not: team.id },
    },
    include: { team: true },
  });

  if (!opponentStanding) throw new Error("No opponents found in this season");

  const { randomUUID } = await import("crypto");
  const { simulateMatch } = await import("../match/match.simulator");
  const { getTeamForMatch, handleMatchCompletion } =
    (await import("../match/match.service")) as any;
  const seed = randomUUID();
  const homeTeamData = await getTeamForMatch(app, team.id);
  const awayTeamData = await getTeamForMatch(app, opponentStanding.team.id);

  const result = simulateMatch(homeTeamData, awayTeamData, seed);

  const match = await app.prisma.match.create({
    data: {
      type: "SEASON",
      status: "COMPLETED",
      homeUserId: userId,
      awayUserId: opponentStanding.team.userId,
      homeTeamId: team.id,
      awayTeamId: opponentStanding.team.id,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      seed,
      seasonId,
    },
  });

  await updateStandings(
    app,
    seasonId,
    team.id,
    result.homeScore,
    result.awayScore,
    result.winner === "home"
      ? "win"
      : result.winner === "draw"
        ? "draw"
        : "loss",
  );

  await updateStandings(
    app,
    seasonId,
    opponentStanding.team.id,
    result.awayScore,
    result.homeScore,
    result.winner === "away"
      ? "win"
      : result.winner === "draw"
        ? "draw"
        : "loss",
  );

  await handleMatchCompletion(app, match, result, seed);

  return { match, result };
}
