"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startMatchmaking = startMatchmaking;
exports.cancelMatchmaking = cancelMatchmaking;
exports.expireStaleMatchmaking = expireStaleMatchmaking;
exports.onMatchmakingMatched = onMatchmakingMatched;
const constants_1 = require("../../config/constants");
const energy_service_1 = require("../user/energy.service");
const socket_emitter_1 = require("../../ws/socket.emitter");
const types_1 = require("../../ws/types");
const match_live_service_1 = require("./match-live.service");
const bot_generator_1 = require("./bot.generator");
async function assertDailyLimit(app, userId) {
    await (0, energy_service_1.assertHasEnergy)(app, userId);
}
async function incrementDailyMatch(app, userIds) {
    await (0, energy_service_1.consumeEnergyForUsers)(app, userIds);
}
async function startMatchmaking(app, userId) {
    await assertDailyLimit(app, userId);
    const myTeam = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
    });
    if (!myTeam)
        throw new Error("No team found. Complete the draft first.");
    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error("User not found");
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
    const expiresAt = new Date(Date.now() + constants_1.MATCH.MATCHMAKING_TIMEOUT_MS);
    const ratingRange = constants_1.MATCH.MATCHMAKING_POINTS_RANGE;
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
            if (!opponentTeam)
                throw new Error("Opponent team not found");
            const match = await (0, match_live_service_1.createPvPMatch)(app, {
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
            (0, socket_emitter_1.emitToUser)(opponent.userId, types_1.ServerEvent.MATCH_FOUND, {
                matchId: match.id,
                opponent: { id: userId, clubName: user.clubName, points: user.points },
                isBot: false,
            });
            (0, socket_emitter_1.emitToUser)(userId, types_1.ServerEvent.MATCH_FOUND, {
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
    (0, socket_emitter_1.emitToUser)(userId, types_1.ServerEvent.MATCHMAKING_STARTED, {
        queueId: queueEntry.id,
        expiresAt: expiresAt.toISOString(),
    });
    scheduleMatchmakingTimeout(app, queueEntry.id, userId);
    return { queueId: queueEntry.id, status: "SEARCHING" };
}
const timeoutTimers = new Map();
function scheduleMatchmakingTimeout(app, queueId, userId) {
    if (timeoutTimers.has(queueId))
        clearTimeout(timeoutTimers.get(queueId));
    const timer = setTimeout(async () => {
        timeoutTimers.delete(queueId);
        await handleMatchmakingTimeout(app, queueId, userId);
    }, constants_1.MATCH.MATCHMAKING_TIMEOUT_MS);
    timeoutTimers.set(queueId, timer);
}
async function handleMatchmakingTimeout(app, queueId, userId) {
    const entry = await app.prisma.matchmakingQueue.findUnique({
        where: { id: queueId },
    });
    if (!entry || entry.status !== "SEARCHING")
        return;
    await app.prisma.matchmakingQueue.update({
        where: { id: queueId },
        data: { status: "EXPIRED" },
    });
    (0, socket_emitter_1.emitToUser)(userId, types_1.ServerEvent.MATCHMAKING_EXPIRED, { queueId });
    try {
        const botResult = await playBotMatchFallback(app, userId);
        (0, socket_emitter_1.emitToUser)(userId, types_1.ServerEvent.MATCH_FOUND, {
            matchId: botResult.match.id,
            opponent: { id: "bot", clubName: "Bot", points: 0 },
            isBot: true,
        });
    }
    catch (err) {
        app.log.error({ err, userId }, "Bot fallback failed after matchmaking timeout");
    }
}
async function playBotMatchFallback(app, userId) {
    const myTeam = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
    });
    if (!myTeam)
        throw new Error("No team found");
    const botResult = await (0, bot_generator_1.generateBotTeam)(app, myTeam.rating);
    const result = await (0, match_live_service_1.startInstantBotMatch)(app, userId, myTeam.id, botResult.team.id);
    await incrementDailyMatch(app, [userId]);
    return result;
}
async function cancelMatchmaking(app, userId) {
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
        clearTimeout(timeoutTimers.get(entry.id));
        timeoutTimers.delete(entry.id);
    }
    await app.prisma.matchmakingQueue.update({
        where: { id: entry.id },
        data: { status: "CANCELLED" },
    });
    (0, socket_emitter_1.emitToUser)(userId, types_1.ServerEvent.MATCHMAKING_CANCELLED, { queueId: entry.id });
    return { success: true };
}
async function expireStaleMatchmaking(app) {
    const stale = await app.prisma.matchmakingQueue.findMany({
        where: { status: "SEARCHING", expiresAt: { lte: new Date() } },
    });
    for (const entry of stale) {
        await handleMatchmakingTimeout(app, entry.id, entry.userId);
    }
    return stale.length;
}
async function onMatchmakingMatched(app, homeUserId, awayUserId, matchId) {
    await incrementDailyMatch(app, [homeUserId, awayUserId]);
}
