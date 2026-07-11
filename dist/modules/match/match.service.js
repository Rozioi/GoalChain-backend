"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateMatch = exports.handleMatchCompletion = exports.getTeamForMatch = exports.cancelMatchmaking = exports.playFriendlyMatch = void 0;
exports.playBotMatch = playBotMatch;
exports.getMatchById = getMatchById;
exports.getMatchHistory = getMatchHistory;
exports.getMatchStreak = getMatchStreak;
const energy_service_1 = require("../user/energy.service");
const bot_generator_1 = require("./bot.generator");
const match_completion_service_1 = require("./match-completion.service");
Object.defineProperty(exports, "handleMatchCompletion", { enumerable: true, get: function () { return match_completion_service_1.handleMatchCompletion; } });
const match_preview_service_1 = require("./match-preview.service");
const match_team_service_1 = require("./match-team.service");
Object.defineProperty(exports, "getTeamForMatch", { enumerable: true, get: function () { return match_team_service_1.getTeamForMatch; } });
Object.defineProperty(exports, "simulateMatch", { enumerable: true, get: function () { return match_team_service_1.simulateMatch; } });
const matchmaking_service_1 = require("./matchmaking.service");
Object.defineProperty(exports, "playFriendlyMatch", { enumerable: true, get: function () { return matchmaking_service_1.startMatchmaking; } });
Object.defineProperty(exports, "cancelMatchmaking", { enumerable: true, get: function () { return matchmaking_service_1.cancelMatchmaking; } });
const match_live_service_1 = require("./match-live.service");
async function playBotMatch(app, userId) {
    await (0, energy_service_1.syncUserEnergy)(app, userId);
    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error("User not found");
    const myTeam = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
    });
    if (!myTeam)
        throw new Error("No team found");
    const botResult = await (0, bot_generator_1.generateBotTeam)(app, myTeam.rating);
    const { match } = await (0, match_live_service_1.startInstantBotMatch)(app, userId, myTeam.id, botResult.team.id);
    return {
        match,
        matchId: match.id,
        status: "IN_PROGRESS",
        isBot: true,
        preloaderData: {
            homePlayer: {
                id: user.id,
                name: user.clubName,
                points: user.points,
            },
            awayPlayer: {
                id: "bot",
                name: botResult.team.name ?? "Bot",
                points: user.points + 10,
            },
        },
    };
}
async function getMatchById(app, matchId) {
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
    if (!match)
        return null;
    const preview = await (0, match_preview_service_1.buildMatchPreview)(app, match);
    let result = null;
    if (match.status === "COMPLETED" || match.status === "IN_PROGRESS") {
        result = {
            homeScore: match.homeScore ?? 0,
            awayScore: match.awayScore ?? 0,
            winner: (match.homeScore ?? 0) > (match.awayScore ?? 0)
                ? "home"
                : (match.awayScore ?? 0) > (match.homeScore ?? 0)
                    ? "away"
                    : "draw",
            currentMinute: match.currentMinute,
            events: (0, match_completion_service_1.formatMatchEvents)(match.events),
        };
    }
    return { match, result, preview };
}
async function getMatchHistory(app, userId, limit = 20) {
    return app.prisma.match.findMany({
        where: {
            OR: [{ homeUserId: userId }, { awayUserId: userId }],
            status: "COMPLETED",
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
            homeTeam: {
                include: {
                    user: {
                        select: {
                            clubIcon: true, // Вытягиваем только иконку, чтобы не перегружать сеть
                        },
                    },
                },
            },
            awayTeam: {
                include: {
                    user: {
                        select: {
                            clubIcon: true,
                        },
                    },
                },
            },
            events: { orderBy: { minute: "asc" } },
        },
    });
}
async function getMatchStreak(app, userId) {
    const streak = await app.prisma.matchStreak.findUnique({
        where: { userId },
    });
    if (!streak) {
        return { userId, streak: 0, bestStreak: 0 };
    }
    return streak;
}
