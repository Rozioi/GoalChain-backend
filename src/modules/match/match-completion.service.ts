import { FastifyInstance } from "fastify";
import { updateTaskProgress } from "../task/task.service";
import { calculateTeamRating, calculateSquadRating } from "../player/synergy.engine";
import { syncUserEnergy, consumeEnergy } from "../user/energy.service";
import {
    calculateMatchRewards,
    outcomeForRole,
    randomWinPoints,
} from "./match-rewards.service";

interface MatchResult {
    homeScore: number;
    awayScore: number;
    winner: "home" | "away" | "draw";
    events: Array<{
        minute: number;
        type: string;
        team: string;
        playerId?: string;
        playerName?: string;
        playerOutId?: string;
        playerOutName?: string;
        description: string;
    }>;
}

export interface PlayerMatchRewards {
    coins: number;
    exp: number;
    points: number;
}

export interface MatchCompletionRewards {
    homeCoins: number;
    awayCoins: number;
    homeExp: number;
    awayExp: number;
    homePoints: number;
    awayPoints: number;
    home: PlayerMatchRewards;
    away: PlayerMatchRewards;
}

export async function handleMatchCompletion(
    app: FastifyInstance,
    match: {
        id: string;
        homeUserId?: string | null;
        awayUserId?: string | null;
        homeTeamId: string;
        awayTeamId?: string | null;
        isBot?: boolean;
        seasonId?: string | null;
    },
    result: MatchResult,
    seed: string,
): Promise<MatchCompletionRewards> {
    // Check if match should be considered a season match
    let resolvedSeasonId = match.seasonId;
    if (!resolvedSeasonId && match.homeUserId) {
      const seasonStanding = await app.prisma.seasonStanding.findFirst({
        where: {
          team: { userId: match.homeUserId, isEvent: false },
          season: { status: "ACTIVE" },
        },
        select: { seasonId: true },
      });
      resolvedSeasonId = seasonStanding?.seasonId;
    }

    if (resolvedSeasonId && match.homeTeamId && match.awayTeamId) {
      await app.prisma.match.update({
        where: { id: match.id },
        data: {
          type: "SEASON",
          seasonId: resolvedSeasonId,
        },
      });
    }

    const homeWinPoints = randomWinPoints();
    const awayWinPoints = randomWinPoints();

    const playerRewards = new Map<string, PlayerMatchRewards>();

    const computeForPlayer = async (
        uid: string,
        role: "home" | "away",
    ): Promise<PlayerMatchRewards> => {
        const user = await app.prisma.user.findUnique({ where: { id: uid } });
        if (!user) return { coins: 0, exp: 0, points: 0 };

        const energyState = await syncUserEnergy(app, uid);
        const hasEnergy = energyState.energy >= 1;
        if (hasEnergy) {
            await consumeEnergy(app, uid);
        }

        const outcome = outcomeForRole(role, result.winner);
        const winPoints = role === "home" ? homeWinPoints : awayWinPoints;
        const rewards = calculateMatchRewards(
            outcome,
            user.points,
            hasEnergy,
            winPoints,
        );

        playerRewards.set(uid, rewards);
        return rewards;
    };

    let homeRewards: PlayerMatchRewards = { coins: 0, exp: 0, points: 0 };
    let awayRewards: PlayerMatchRewards = { coins: 0, exp: 0, points: 0 };

    const homeId = match.homeUserId;
    const awayId = match.awayUserId;

    if (homeId) {
        homeRewards = await computeForPlayer(homeId, "home");
    } else {
        const outcome = outcomeForRole("home", result.winner);
        homeRewards = calculateMatchRewards(outcome, 0, false, homeWinPoints);
    }

    if (awayId && !match.isBot) {
        awayRewards = await computeForPlayer(awayId, "away");
    } else if (awayId) {
        const outcome = outcomeForRole("away", result.winner);
        awayRewards = calculateMatchRewards(outcome, 0, false, awayWinPoints);
    }

    await app.prisma.match.update({
        where: { id: match.id },
        data: {
            status: "COMPLETED",
            homeScore: result.homeScore,
            awayScore: result.awayScore,
            seed,
            homeCoins: homeRewards.coins,
            awayCoins: awayRewards.coins,
            homeExp: homeRewards.exp,
            awayExp: awayRewards.exp,
            finishedAt: new Date(),
            currentMinute: 90,
            events: {
                create: result.events.map((e) => ({
                    minute: e.minute,
                    type: e.type.toUpperCase(),
                    team: e.team,
                    playerId: e.playerId,
                    playerName: e.playerName,
                    playerOutId: e.playerOutId,
                    playerOutName: e.playerOutName,
                    description: e.description,
                })),
            },
        },
    });

    const updatePlayer = async (uid: string, role: "home" | "away") => {
        const rewards = playerRewards.get(uid);
        if (!rewards) return;

        const user = await app.prisma.user.findUnique({ where: { id: uid } });
        if (!user) return;

        const { coins, exp, points } = rewards;

        let newExp = user.experience + exp;
        let newLevel = user.level;
        const newPoints = Math.max(0, user.points + points);

        while (newExp >= newLevel * 500) {
            newExp -= newLevel * 500;
            newLevel += 1;
        }

        await app.prisma.user.update({
            where: { id: uid },
            data: {
                coins: { increment: coins },
                experience: newExp,
                level: newLevel,
                points: newPoints,
            },
        });

        if (coins > 0) {
            await app.prisma.economyLog.create({
                data: {
                    userId: uid,
                    amount: coins,
                    source: "MATCH_REWARD",
                    details: { matchId: match.id, role, result: result.winner },
                },
            });
        }

        await updateTaskProgress(app, uid, "MATCHES", 1);
        if (result.winner === role)
            await updateTaskProgress(app, uid, "WINS", 1);

        const userScore = role === "home" ? result.homeScore : result.awayScore;
        const opponentScore =
            role === "home" ? result.awayScore : result.homeScore;

        if (userScore > 0)
            await updateTaskProgress(app, uid, "GOALS", userScore);
        if (opponentScore === 0)
            await updateTaskProgress(app, uid, "CLEAN_SHEETS", 1);
    };

    if (homeId) await updatePlayer(homeId, "home");
    if (awayId && !match.isBot) await updatePlayer(awayId, "away");

    const recalcTeam = async (teamId?: string | null) => {
        if (!teamId) return;
        try {
            const team = await app.prisma.team.findUnique({
                where: { id: teamId },
                include: { players: { include: { player: true } } },
            });
            if (!team) return;
            const allPlayers = team.players.map((tp) => ({
                position: tp.player.position,
                role: tp.player.role,
                style: tp.player.style,
                overallRating: tp.player.overallRating,
            }));
            const newRating = calculateSquadRating(allPlayers);
            await app.prisma.team.update({
                where: { id: teamId },
                data: { rating: newRating },
            });
        } catch (err) {
            app.log.warn({ err, teamId }, "Failed to recalc team rating");
        }
    };

    await recalcTeam(match.homeTeamId);
    await recalcTeam(match.awayTeamId);

    // Update season standings if this is a season match
    if (resolvedSeasonId && match.awayTeamId) {
      try {
        const { updateStandings } = await import("../season/season.service");

        await updateStandings(
          app,
          resolvedSeasonId,
          match.homeTeamId,
          result.homeScore,
          result.awayScore,
          result.winner === "home" ? "win" : result.winner === "draw" ? "draw" : "loss",
        );

        await updateStandings(
          app,
          resolvedSeasonId,
          match.awayTeamId,
          result.awayScore,
          result.homeScore,
          result.winner === "away" ? "win" : result.winner === "draw" ? "draw" : "loss",
        );
      } catch (err) {
        app.log.warn({ err, matchId: match.id }, "Failed to update season standings");
      }
    }

    // Increment matchesPlayed for all players who participated
    const incrementMatches = async (teamId: string) => {
        const teamPlayers = await app.prisma.teamPlayer.findMany({
            where: { teamId },
            select: { playerId: true },
        });
        const playerIds = teamPlayers.map((tp) => tp.playerId);
        if (playerIds.length > 0) {
            await app.prisma.player.updateMany({
                where: { id: { in: playerIds } },
                data: { matchesPlayed: { increment: 1 } },
            });
        }
    };

    await incrementMatches(match.homeTeamId);
    if (match.awayTeamId) {
        await incrementMatches(match.awayTeamId);
    }

    // Update match streaks
    const updateStreak = async (uid: string, role: "home" | "away") => {
        const won = result.winner === role;

        let streak = await app.prisma.matchStreak.findUnique({
            where: { userId: uid },
        });

        if (!streak) {
            streak = await app.prisma.matchStreak.create({
                data: {
                    userId: uid,
                    streak: won ? 1 : 0,
                    bestStreak: won ? 1 : 0,
                },
            });
        } else {
            const newStreak = won ? streak.streak + 1 : 0;
            const newBest = Math.max(newStreak, streak.bestStreak);

            await app.prisma.matchStreak.update({
                where: { userId: uid },
                data: {
                    streak: newStreak,
                    bestStreak: newBest,
                },
            });
        }
    };

    if (homeId) await updateStreak(homeId, "home");
    if (awayId && !match.isBot) await updateStreak(awayId, "away");

    return {
        homeCoins: homeRewards.coins,
        awayCoins: awayRewards.coins,
        homeExp: homeRewards.exp,
        awayExp: awayRewards.exp,
        homePoints: homeRewards.points,
        awayPoints: awayRewards.points,
        home: homeRewards,
        away: awayRewards,
    };
}

export function formatMatchEvents(
    events: Array<{
        type: string;
        minute: number;
        team: string;
        playerId: string | null;
        playerName: string | null;
        playerOutId?: string | null;
        playerOutName?: string | null;
        description: string;
    }>,
) {
    return events.map((e) => {
        let type = e.type.toLowerCase();
        if (type === "yellow_card") type = "yellowCard";
        if (type === "red_card") type = "redCard";
        if (type === "tactic_change") type = "tacticChange";
        return {
            minute: e.minute,
            type,
            team: e.team,
            playerId: e.playerId,
            playerName: e.playerName,
            playerOutId: e.playerOutId,
            playerOutName: e.playerOutName,
            description: e.description,
        };
    });
}
