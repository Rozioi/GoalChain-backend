import { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import { MatchType } from "@prisma/client";
import {
    emitToMatch,
    emitToUser,
    matchRoom,
    userRoom,
} from "../../ws/socket.emitter";
import { ServerEvent } from "../../ws/types";
import { MATCH } from "../../config/constants";
import {
    handleMatchCompletion,
    formatMatchEvents,
} from "./match-completion.service";
import { loadTeamsForMatch, simulateMatch } from "./match-team.service";
import type { MatchEvent } from "./match.simulator";

const activeRunners = new Map<string, NodeJS.Timeout>();

export async function createMatchFromInvite(
    app: FastifyInstance,
    params: {
        inviteId: string;
        homeUserId: string;
        awayUserId: string;
        homeTeamId: string;
        awayTeamId: string;
        type: MatchType;
    },
) {
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

export async function createPvPMatch(
    app: FastifyInstance,
    params: {
        homeUserId: string;
        awayUserId: string;
        homeTeamId: string;
        awayTeamId: string;
        type?: MatchType;
    },
) {
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
        app.io.in(userRoom(params.homeUserId)).socketsJoin(matchRoom(match.id));
        app.io.in(userRoom(params.awayUserId)).socketsJoin(matchRoom(match.id));
    }

    emitToUser(params.homeUserId, ServerEvent.MATCH_READY, {
        matchId: match.id,
    });
    emitToUser(params.awayUserId, ServerEvent.MATCH_READY, {
        matchId: match.id,
    });

    return match;
}

export async function markPlayerReady(
    app: FastifyInstance,
    userId: string,
    matchId: string,
) {
    const match = await app.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new Error("Match not found");
    if (match.status !== "READY")
        throw new Error("Match is not in ready state");

    const isHome = match.homeUserId === userId;
    const isAway = match.awayUserId === userId;
    if (!isHome && !isAway) throw new Error("Not your match");

    const updateData = isHome ? { homeReady: true } : { awayReady: true };
    const updated = await app.prisma.match.update({
        where: { id: matchId },
        data: updateData,
    });

    emitToMatch(matchId, ServerEvent.MATCH_READY, {
        matchId,
        homeReady: isHome ? true : updated.homeReady,
        awayReady: isAway ? true : updated.awayReady,
    });

    const ready =
        (isHome || updated.homeReady) && (isAway || updated.awayReady);

    if (ready) {
        await startLiveMatch(app, matchId);
    }
}

export async function startLiveMatch(app: FastifyInstance, matchId: string) {
    const match = await app.prisma.match.findUnique({ where: { id: matchId } });
    if (!match || !match.awayTeamId) throw new Error("Match not ready");
    if (match.status !== "READY") return;

    // Небольшая задержка, чтобы оба клиента успели присоединиться к WS комнате
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const seed = randomUUID();
    const { homeTeamData, awayTeamData } = await loadTeamsForMatch(
        app,
        match.homeTeamId,
        match.awayTeamId,
        match.homePressingType,
        match.awayPressingType,
    );

    const result = simulateMatch(homeTeamData, awayTeamData, seed);

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

    emitToMatch(matchId, ServerEvent.MATCH_STARTED, startedPayload);

    if (match.homeUserId) {
        emitToUser(match.homeUserId, ServerEvent.MATCH_STARTED, startedPayload);
    }
    if (match.awayUserId) {
        emitToUser(match.awayUserId, ServerEvent.MATCH_STARTED, startedPayload);
    }

    streamMatchEvents(app, matchId, result, seed, match);
}

function streamMatchEvents(
    app: FastifyInstance,
    matchId: string,
    result: ReturnType<typeof simulateMatch>,
    seed: string,
    match: {
        homeUserId: string | null;
        awayUserId: string | null;
        isBot: boolean;
        homeTeamId: string;
        awayTeamId: string | null;
    },
) {
    if (activeRunners.has(matchId)) {
        clearTimeout(activeRunners.get(matchId)!);
    }

    const msPerMinute = MATCH.LIVE_MS_PER_MINUTE;
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

        while (
            eventIndex < sortedEvents.length &&
            sortedEvents[eventIndex].minute <= targetMinute
        ) {
            const e = sortedEvents[eventIndex];
            emitToMatch(matchId, ServerEvent.MATCH_EVENT, {
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

async function finishLiveMatch(
    app: FastifyInstance,
    matchId: string,
    result: ReturnType<typeof simulateMatch>,
    seed: string,
    match: {
        homeUserId: string | null;
        awayUserId: string | null;
        isBot: boolean;
        homeTeamId: string;
        awayTeamId: string | null;
    },
) {
    const rewards = await handleMatchCompletion(
        app,
        { ...match, id: matchId },
        result,
        seed,
    );

    const role = (userId: string) => {
        if (userId === match.homeUserId) return "home" as const;
        return "away" as const;
    };

    const buildRewards = (userId: string) => {
        const r = role(userId);
        const coins = r === "home" ? rewards.homeCoins : rewards.awayCoins;
        const exp = r === "home" ? rewards.homeExp : rewards.awayExp;
        const points = r === "home" ? rewards.homePoints : rewards.awayPoints;
        return { coins, exp, points };
    };

    emitToMatch(matchId, ServerEvent.MATCH_FINISHED, {
        matchId,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        winner: result.winner,
    });

    if (match.homeUserId) {
        emitToUser(match.homeUserId, ServerEvent.MATCH_FINISHED, {
            matchId,
            homeScore: result.homeScore,
            awayScore: result.awayScore,
            winner: result.winner,
            rewards: buildRewards(match.homeUserId),
        });
    }

    if (match.awayUserId && match.awayUserId !== match.homeUserId) {
        emitToUser(match.awayUserId, ServerEvent.MATCH_FINISHED, {
            matchId,
            homeScore: result.homeScore,
            awayScore: result.awayScore,
            winner: result.winner,
            rewards: buildRewards(match.awayUserId),
        });
    }
}

export async function startInstantBotMatch(
    app: FastifyInstance,
    userId: string,
    homeTeamId: string,
    awayTeamId: string,
) {
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
        app.io.in(userRoom(userId)).socketsJoin(matchRoom(match.id));
    }

    // Delay so the client can enter PREMATCH and join the WebSocket room
    setTimeout(() => {
        startLiveMatch(app, match.id).catch((err) => {
            app.log.error(
                { err, matchId: match.id },
                "Failed to start bot live match",
            );
        });
    }, 3000);

    return { match };
}

export async function updateLiveTactics(
    app: FastifyInstance,
    matchId: string,
    userId: string,
    tactics: {
        pressingType?: "SOFT" | "MEDIUM" | "INTENSIVE";
        substitutions?: { outId: string; inId: string }[];
    },
) {
    const match = await app.prisma.match.findUnique({
        where: { id: matchId },
        include: { events: true },
    });

    if (!match) throw new Error("Match not found");
    if (match.status !== "IN_PROGRESS") throw new Error("Match not active");

    const isHome = match.homeUserId === userId;
    const isAway = match.awayUserId === userId;
    if (!isHome && !isAway) throw new Error("Not your match");

    const team: "home" | "away" = isHome ? "home" : "away";
    const currentMinute = match.currentMinute;

    if (tactics.pressingType) {
        await app.prisma.match.update({
            where: { id: matchId },
            data: isHome
                ? { homePressingType: tactics.pressingType }
                : { awayPressingType: tactics.pressingType },
        });
    }

    emitToMatch(matchId, ServerEvent.TACTICS_UPDATED, {
        matchId,
        userId,
        team,
        pressingType: tactics.pressingType,
        substitutions: tactics.substitutions,
        minute: currentMinute,
    });

    if (activeRunners.has(matchId)) {
        clearTimeout(activeRunners.get(matchId)!);
        activeRunners.delete(matchId);
    }

    if (!match.awayTeamId || !match.seed)
        throw new Error("Match data incomplete");

    const { homeTeamData, awayTeamData } = await loadTeamsForMatch(
        app,
        match.homeTeamId,
        match.awayTeamId,
        match.homePressingType,
        match.awayPressingType,
    );

    const lockedEvents = match.events
        .filter((e) => e.minute < currentMinute)
        .map((e): MatchEvent => ({
            minute: e.minute,
            type: e.type.toLowerCase() as
                | "goal"
                | "yellowCard"
                | "redCard"
                | "save"
                | "chance"
                | "foul"
                | "injury"
                | "substitution",
            team: e.team as "home" | "away",
            playerId: e.playerId ?? undefined,
            playerName: e.playerName ?? undefined,
            description: e.description,
        }));

    const result = simulateMatch(homeTeamData, awayTeamData, match.seed, {
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

export function stopMatchRunner(matchId: string) {
    if (activeRunners.has(matchId)) {
        clearTimeout(activeRunners.get(matchId)!);
        activeRunners.delete(matchId);
    }
}
