import { FastifyInstance } from "fastify";
import { syncUserEnergy } from "../user/energy.service";
import { generateBotTeam } from "./bot.generator";
import {
    formatMatchEvents,
    handleMatchCompletion,
} from "./match-completion.service";
import { buildMatchPreview } from "./match-preview.service";
import { getTeamForMatch, simulateMatch } from "./match-team.service";
import { startMatchmaking, cancelMatchmaking } from "./matchmaking.service";
import { startInstantBotMatch } from "./match-live.service";

export { startMatchmaking as playFriendlyMatch };
export { cancelMatchmaking };

export async function playBotMatch(app: FastifyInstance, userId: string) {
    await syncUserEnergy(app, userId);

    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const myTeam = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
    });
    if (!myTeam) throw new Error("No team found");

    const botResult = await generateBotTeam(app, myTeam.rating);
    const { match } = await startInstantBotMatch(
        app,
        userId,
        myTeam.id,
        botResult.team.id,
    );

    return {
        match,
        matchId: match.id,
        status: "IN_PROGRESS" as const,
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

    const preview = await buildMatchPreview(app, match);

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

    return { match, result, preview };
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

export async function getMatchStreak(app: FastifyInstance, userId: string) {
    const streak = await app.prisma.matchStreak.findUnique({
        where: { userId },
    });

    if (!streak) {
        return { userId, streak: 0, bestStreak: 0 };
    }

    return streak;
}

export { getTeamForMatch, handleMatchCompletion, simulateMatch };
