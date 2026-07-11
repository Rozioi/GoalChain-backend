"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMatchFromInvite = createMatchFromInvite;
exports.createPvPMatch = createPvPMatch;
exports.markPlayerReady = markPlayerReady;
exports.startLiveMatch = startLiveMatch;
exports.startInstantBotMatch = startInstantBotMatch;
exports.updateLiveTactics = updateLiveTactics;
exports.stopMatchRunner = stopMatchRunner;
const crypto_1 = require("crypto");
const socket_emitter_1 = require("../../ws/socket.emitter");
const types_1 = require("../../ws/types");
const constants_1 = require("../../config/constants");
const match_completion_service_1 = require("./match-completion.service");
const match_team_service_1 = require("./match-team.service");
const activeRunners = new Map();
async function createMatchFromInvite(app, params) {
    return app.prisma.match.create({
        data: {
            type: params.type,
            status: "READY",
            homeUserId: params.homeUserId,
            awayUserId: params.awayUserId,
            homeTeamId: params.homeTeamId,
            awayTeamId: params.awayTeamId,
            inviteId: params.inviteId,
        },
    });
}
async function createPvPMatch(app, params) {
    const match = await app.prisma.match.create({
        data: {
            type: params.type ?? "FRIENDLY",
            status: "READY",
            homeUserId: params.homeUserId,
            awayUserId: params.awayUserId,
            homeTeamId: params.homeTeamId,
            awayTeamId: params.awayTeamId,
        },
    });
    if (app.io) {
        app.io.in((0, socket_emitter_1.userRoom)(params.homeUserId)).socketsJoin((0, socket_emitter_1.matchRoom)(match.id));
        app.io.in((0, socket_emitter_1.userRoom)(params.awayUserId)).socketsJoin((0, socket_emitter_1.matchRoom)(match.id));
    }
    (0, socket_emitter_1.emitToUser)(params.homeUserId, types_1.ServerEvent.MATCH_READY, {
        matchId: match.id,
    });
    (0, socket_emitter_1.emitToUser)(params.awayUserId, types_1.ServerEvent.MATCH_READY, {
        matchId: match.id,
    });
    return match;
}
async function markPlayerReady(app, userId, matchId) {
    const match = await app.prisma.match.findUnique({ where: { id: matchId } });
    if (!match)
        throw new Error("Match not found");
    if (match.status !== "READY")
        throw new Error("Match is not in ready state");
    const isHome = match.homeUserId === userId;
    const isAway = match.awayUserId === userId;
    if (!isHome && !isAway)
        throw new Error("Not your match");
    const updateData = isHome ? { homeReady: true } : { awayReady: true };
    const updated = await app.prisma.match.update({
        where: { id: matchId },
        data: updateData,
    });
    (0, socket_emitter_1.emitToMatch)(matchId, types_1.ServerEvent.MATCH_READY, {
        matchId,
        homeReady: isHome ? true : updated.homeReady,
        awayReady: isAway ? true : updated.awayReady,
    });
    const ready = (isHome || updated.homeReady) && (isAway || updated.awayReady);
    if (ready) {
        await startLiveMatch(app, matchId);
    }
}
async function startLiveMatch(app, matchId) {
    const match = await app.prisma.match.findUnique({ where: { id: matchId } });
    if (!match || !match.awayTeamId)
        throw new Error("Match not ready");
    if (match.status !== "READY")
        return;
    const seed = (0, crypto_1.randomUUID)();
    const { homeTeamData, awayTeamData } = await (0, match_team_service_1.loadTeamsForMatch)(app, match.homeTeamId, match.awayTeamId, match.homePressingType, match.awayPressingType);
    const result = (0, match_team_service_1.simulateMatch)(homeTeamData, awayTeamData, seed);
    await app.prisma.match.update({
        where: { id: matchId },
        data: {
            status: "IN_PROGRESS",
            seed,
            startedAt: new Date(),
            homeScore: 0,
            awayScore: 0,
            currentMinute: 0,
        },
    });
    const startedPayload = {
        matchId,
        seed,
        homeUserId: match.homeUserId,
        awayUserId: match.awayUserId,
    };
    (0, socket_emitter_1.emitToMatch)(matchId, types_1.ServerEvent.MATCH_STARTED, startedPayload);
    if (match.homeUserId) {
        (0, socket_emitter_1.emitToUser)(match.homeUserId, types_1.ServerEvent.MATCH_STARTED, startedPayload);
    }
    if (match.awayUserId) {
        (0, socket_emitter_1.emitToUser)(match.awayUserId, types_1.ServerEvent.MATCH_STARTED, startedPayload);
    }
    streamMatchEvents(app, matchId, result, seed, match);
}
function streamMatchEvents(app, matchId, result, seed, match) {
    if (activeRunners.has(matchId)) {
        clearTimeout(activeRunners.get(matchId));
    }
    const msPerMinute = constants_1.MATCH.LIVE_MS_PER_MINUTE;
    let eventIndex = 0;
    const sortedEvents = [...result.events].sort((a, b) => a.minute - b.minute);
    const tick = async () => {
        const current = await app.prisma.match.findUnique({
            where: { id: matchId },
            select: { status: true, currentMinute: true },
        });
        if (!current || current.status !== "IN_PROGRESS") {
            activeRunners.delete(matchId);
            return;
        }
        const targetMinute = current.currentMinute + 1;
        while (eventIndex < sortedEvents.length &&
            sortedEvents[eventIndex].minute <= targetMinute) {
            const e = sortedEvents[eventIndex];
            (0, socket_emitter_1.emitToMatch)(matchId, types_1.ServerEvent.MATCH_EVENT, {
                matchId,
                minute: e.minute,
                type: e.type,
                team: e.team,
                playerId: e.playerId,
                playerName: e.playerName,
                description: e.description,
            });
            eventIndex++;
        }
        const homeGoals = sortedEvents
            .slice(0, eventIndex)
            .filter((e) => e.type === "goal" && e.team === "home").length;
        const awayGoals = sortedEvents
            .slice(0, eventIndex)
            .filter((e) => e.type === "goal" && e.team === "away").length;
        await app.prisma.match.update({
            where: { id: matchId },
            data: {
                currentMinute: targetMinute,
                homeScore: homeGoals,
                awayScore: awayGoals,
            },
        });
        if (targetMinute >= 90) {
            activeRunners.delete(matchId);
            await finishLiveMatch(app, matchId, result, seed, match);
            return;
        }
        const timer = setTimeout(tick, msPerMinute);
        activeRunners.set(matchId, timer);
    };
    const timer = setTimeout(tick, msPerMinute);
    activeRunners.set(matchId, timer);
}
async function finishLiveMatch(app, matchId, result, seed, match) {
    const rewards = await (0, match_completion_service_1.handleMatchCompletion)(app, { ...match, id: matchId }, result, seed);
    const role = (userId) => {
        if (userId === match.homeUserId)
            return "home";
        return "away";
    };
    const buildRewards = (userId) => {
        const r = role(userId);
        const coins = r === "home" ? rewards.homeCoins : rewards.awayCoins;
        const exp = r === "home" ? rewards.homeExp : rewards.awayExp;
        const points = r === "home" ? rewards.homePoints : rewards.awayPoints;
        return { coins, exp, points };
    };
    (0, socket_emitter_1.emitToMatch)(matchId, types_1.ServerEvent.MATCH_FINISHED, {
        matchId,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        winner: result.winner,
    });
    if (match.homeUserId) {
        (0, socket_emitter_1.emitToUser)(match.homeUserId, types_1.ServerEvent.MATCH_FINISHED, {
            matchId,
            homeScore: result.homeScore,
            awayScore: result.awayScore,
            winner: result.winner,
            rewards: buildRewards(match.homeUserId),
        });
    }
    if (match.awayUserId && match.awayUserId !== match.homeUserId) {
        (0, socket_emitter_1.emitToUser)(match.awayUserId, types_1.ServerEvent.MATCH_FINISHED, {
            matchId,
            homeScore: result.homeScore,
            awayScore: result.awayScore,
            winner: result.winner,
            rewards: buildRewards(match.awayUserId),
        });
    }
}
async function startInstantBotMatch(app, userId, homeTeamId, awayTeamId) {
    const match = await app.prisma.match.create({
        data: {
            type: "FRIENDLY",
            status: "READY",
            homeUserId: userId,
            homeTeamId,
            awayTeamId,
            isBot: true,
            homeReady: true,
            awayReady: true,
        },
    });
    if (app.io) {
        app.io.in((0, socket_emitter_1.userRoom)(userId)).socketsJoin((0, socket_emitter_1.matchRoom)(match.id));
    }
    // Delay so the client can enter PREMATCH and join the WebSocket room
    setTimeout(() => {
        startLiveMatch(app, match.id).catch((err) => {
            app.log.error({ err, matchId: match.id }, "Failed to start bot live match");
        });
    }, 3000);
    return { match };
}
async function updateLiveTactics(app, matchId, userId, tactics) {
    const match = await app.prisma.match.findUnique({
        where: { id: matchId },
        include: { events: true },
    });
    if (!match)
        throw new Error("Match not found");
    if (match.status !== "IN_PROGRESS")
        throw new Error("Match not active");
    const isHome = match.homeUserId === userId;
    const isAway = match.awayUserId === userId;
    if (!isHome && !isAway)
        throw new Error("Not your match");
    const team = isHome ? "home" : "away";
    const currentMinute = match.currentMinute;
    if (tactics.pressingType) {
        await app.prisma.match.update({
            where: { id: matchId },
            data: isHome
                ? { homePressingType: tactics.pressingType }
                : { awayPressingType: tactics.pressingType },
        });
    }
    (0, socket_emitter_1.emitToMatch)(matchId, types_1.ServerEvent.TACTICS_UPDATED, {
        matchId,
        userId,
        team,
        pressingType: tactics.pressingType,
        substitutions: tactics.substitutions,
        minute: currentMinute,
    });
    if (activeRunners.has(matchId)) {
        clearTimeout(activeRunners.get(matchId));
        activeRunners.delete(matchId);
    }
    if (!match.awayTeamId || !match.seed)
        throw new Error("Match data incomplete");
    const { homeTeamData, awayTeamData } = await (0, match_team_service_1.loadTeamsForMatch)(app, match.homeTeamId, match.awayTeamId, match.homePressingType, match.awayPressingType);
    const lockedEvents = match.events
        .filter((e) => e.minute < currentMinute)
        .map((e) => ({
        minute: e.minute,
        type: e.type.toLowerCase(),
        team: e.team,
        playerId: e.playerId ?? undefined,
        playerName: e.playerName ?? undefined,
        description: e.description,
    }));
    const result = (0, match_team_service_1.simulateMatch)(homeTeamData, awayTeamData, match.seed, {
        lockedEvents,
        skipUntilMinute: currentMinute,
        manualSubstitutions: (tactics.substitutions ?? []).map((s) => ({
            minute: currentMinute,
            team,
            outId: s.outId,
            inId: s.inId,
        })),
    });
    await app.prisma.matchEvent.deleteMany({
        where: { matchId, minute: { gte: currentMinute } },
    });
    await app.prisma.match.update({
        where: { id: matchId },
        data: {
            homeScore: result.homeScore,
            awayScore: result.awayScore,
        },
    });
    streamMatchEvents(app, matchId, result, match.seed, match);
}
function stopMatchRunner(matchId) {
    if (activeRunners.has(matchId)) {
        clearTimeout(activeRunners.get(matchId));
        activeRunners.delete(matchId);
    }
}
