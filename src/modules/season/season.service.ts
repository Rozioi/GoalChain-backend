import { FastifyInstance } from "fastify";
import { SEASON } from "../../config/constants";

export async function getCurrentSeason(app: FastifyInstance) {
    return app.prisma.season.findFirst({
        where: { status: { in: ["ACTIVE", "PLAYOFFS"] } },
        include: {
            standings: {
                include: { team: true },
                orderBy: [{ points: "desc" }, { goalsFor: "desc" }],
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
        include: { team: true },
        orderBy: [{ points: "desc" }, { goalsFor: "desc" }],
    });
}

export async function registerForSeason(
    app: FastifyInstance,
    userId: string,
) {
    const season = await app.prisma.season.findFirst({
        where: { status: "UPCOMING" },
    });

    if (!season) throw new Error("No upcoming season");

    const team = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
    });

    if (!team) throw new Error("No team. Complete draft first.");

    // Check if already registered
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
    if (season.status === "COMPLETED") throw new Error("Season already completed");

    // Distribute rewards
    const rewards = [
        SEASON.REWARDS.FIRST_PLACE,
        SEASON.REWARDS.SECOND_PLACE,
        SEASON.REWARDS.THIRD_PLACE,
    ];

    for (let i = 0; i < season.standings.length; i++) {
        const standing = season.standings[i];
        const reward = rewards[i];

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
