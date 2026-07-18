"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentSeason = getCurrentSeason;
exports.getSeasonStandings = getSeasonStandings;
exports.registerForSeason = registerForSeason;
exports.updateStandings = updateStandings;
exports.createSeason = createSeason;
exports.checkAndStartUpcomingSeasons = checkAndStartUpcomingSeasons;
exports.checkAndEndExpiredSeasons = checkAndEndExpiredSeasons;
exports.endSeason = endSeason;
exports.playSeasonMatch = playSeasonMatch;
const constants_1 = require("../../config/constants");
async function getCurrentSeason(app) {
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
                                    clubName: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });
}
async function getSeasonStandings(app, seasonId, userId, filter) {
    if (filter === "FRIENDS" && userId) {
        // Получаем реферралов пользователя через Referral модель
        const referrals = await app.prisma.referral.findMany({
            where: { inviterId: userId },
            select: { inviteeId: true },
        });
        const friendIds = [
            userId,
            ...referrals.map((r) => r.inviteeId),
        ];
        const friendTeams = await app.prisma.team.findMany({
            where: { userId: { in: friendIds }, isEvent: false },
            select: { id: true },
        });
        const teamIds = friendTeams.map((t) => t.id);
        return app.prisma.seasonStanding.findMany({
            where: { seasonId, teamId: { in: teamIds } },
            include: {
                team: {
                    include: {
                        user: {
                            select: {
                                username: true,
                                clubName: true,
                                firstName: true,
                            },
                        },
                    },
                },
            },
            orderBy: [{ points: "desc" }, { goalsFor: "desc" }],
        });
    }
    return app.prisma.seasonStanding.findMany({
        where: { seasonId },
        include: {
            team: {
                include: {
                    user: {
                        select: {
                            username: true,
                            clubName: true,
                            firstName: true,
                        },
                    },
                },
            },
        },
        orderBy: [{ points: "desc" }, { goalsFor: "desc" }],
    });
}
async function registerForSeason(app, userId) {
    const season = await app.prisma.season.findFirst({
        where: { status: { in: ["UPCOMING", "ACTIVE"] } },
        orderBy: { startDate: "desc" },
    });
    if (!season)
        throw new Error("No active or upcoming season");
    const team = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
    });
    if (!team)
        throw new Error("No team. Complete draft first.");
    const existing = await app.prisma.seasonStanding.findUnique({
        where: { seasonId_teamId: { seasonId: season.id, teamId: team.id } },
    });
    if (existing)
        throw new Error("Already registered for this season");
    // догоняем — played пока 0, но команда уже в таблице
    const standing = await app.prisma.seasonStanding.create({
        data: {
            seasonId: season.id,
            teamId: team.id,
        },
    });
    return { season, standing };
}
async function updateStandings(app, seasonId, teamId, goalsFor, goalsAgainst, result) {
    const update = {
        played: { increment: 1 },
        goalsFor: { increment: goalsFor },
        goalsAgainst: { increment: goalsAgainst },
    };
    if (result === "win") {
        update.wins = { increment: 1 };
        update.points = { increment: 3 };
    }
    else if (result === "draw") {
        update.draws = { increment: 1 };
        update.points = { increment: 1 };
    }
    else {
        update.losses = { increment: 1 };
    }
    return app.prisma.seasonStanding.update({
        where: { seasonId_teamId: { seasonId, teamId } },
        data: update,
    });
}
async function createSeason(app, name, division) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + constants_1.SEASON.DURATION_WEEKS * 7);
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
/**
 * Automatically start seasons whose startDate has passed and are still UPCOMING
 */
async function checkAndStartUpcomingSeasons(app) {
    const now = new Date();
    const startingSeasons = await app.prisma.season.findMany({
        where: {
            startDate: { lte: now },
            status: "UPCOMING",
        },
    });
    for (const season of startingSeasons) {
        await app.prisma.season.update({
            where: { id: season.id },
            data: { status: "ACTIVE" },
        });
        app.log.info(`Season ${season.id} has been automatically started.`);
    }
}
async function checkAndEndExpiredSeasons(app) {
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
async function endSeason(app, seasonId) {
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
    if (!season)
        throw new Error("Season not found");
    if (season.status === "COMPLETED")
        throw new Error("Season already completed");
    const rewards = [
        constants_1.SEASON.REWARDS.FIRST_PLACE,
        constants_1.SEASON.REWARDS.SECOND_PLACE,
        constants_1.SEASON.REWARDS.THIRD_PLACE,
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
async function playSeasonMatch(app, userId) {
    const team = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
    });
    if (!team)
        throw new Error("No team found");
    const standing = await app.prisma.seasonStanding.findFirst({
        where: { teamId: team.id, season: { status: "ACTIVE" } },
        include: { season: true },
    });
    if (!standing)
        throw new Error("No active season membership found");
    const seasonId = standing.seasonId;
    const opponentStanding = await app.prisma.seasonStanding.findFirst({
        where: {
            seasonId,
            teamId: { not: team.id },
        },
        include: { team: true },
    });
    if (!opponentStanding)
        throw new Error("No opponents found in this season");
    const { startInstantBotMatch } = await Promise.resolve().then(() => __importStar(require("../match/match-live.service")));
    const { match } = await startInstantBotMatch(app, userId, team.id, opponentStanding.team.id);
    // Update match type and seasonId after creation
    await app.prisma.match.update({
        where: { id: match.id },
        data: {
            type: "SEASON",
            seasonId,
            awayUserId: opponentStanding.team.userId,
            isBot: false,
        },
    });
    return {
        match,
        matchId: match.id,
        status: "IN_PROGRESS",
        isBot: false,
        preloaderData: {
            homePlayer: {
                id: userId,
                name: team.name ?? "Home",
                points: standing.points,
            },
            awayPlayer: {
                id: opponentStanding.team.userId,
                name: opponentStanding.team.name ?? "Away",
                points: opponentStanding.points,
            },
        },
    };
}
