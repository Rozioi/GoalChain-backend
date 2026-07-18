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
exports.handleMatchCompletion = handleMatchCompletion;
exports.formatMatchEvents = formatMatchEvents;
const task_service_1 = require("../task/task.service");
const synergy_engine_1 = require("../player/synergy.engine");
const energy_service_1 = require("../user/energy.service");
const match_rewards_service_1 = require("./match-rewards.service");
async function handleMatchCompletion(app, match, result, seed) {
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
    const homeWinPoints = (0, match_rewards_service_1.randomWinPoints)();
    const awayWinPoints = (0, match_rewards_service_1.randomWinPoints)();
    const playerRewards = new Map();
    const computeForPlayer = async (uid, role) => {
        const user = await app.prisma.user.findUnique({ where: { id: uid } });
        if (!user)
            return { coins: 0, exp: 0, points: 0 };
        const energyState = await (0, energy_service_1.syncUserEnergy)(app, uid);
        const hasEnergy = energyState.energy >= 1;
        if (hasEnergy) {
            await (0, energy_service_1.consumeEnergy)(app, uid);
        }
        const outcome = (0, match_rewards_service_1.outcomeForRole)(role, result.winner);
        const winPoints = role === "home" ? homeWinPoints : awayWinPoints;
        const rewards = (0, match_rewards_service_1.calculateMatchRewards)(outcome, user.points, hasEnergy, winPoints);
        playerRewards.set(uid, rewards);
        return rewards;
    };
    let homeRewards = { coins: 0, exp: 0, points: 0 };
    let awayRewards = { coins: 0, exp: 0, points: 0 };
    const homeId = match.homeUserId;
    const awayId = match.awayUserId;
    if (homeId) {
        homeRewards = await computeForPlayer(homeId, "home");
    }
    else {
        const outcome = (0, match_rewards_service_1.outcomeForRole)("home", result.winner);
        homeRewards = (0, match_rewards_service_1.calculateMatchRewards)(outcome, 0, false, homeWinPoints);
    }
    if (awayId && !match.isBot) {
        awayRewards = await computeForPlayer(awayId, "away");
    }
    else if (awayId) {
        const outcome = (0, match_rewards_service_1.outcomeForRole)("away", result.winner);
        awayRewards = (0, match_rewards_service_1.calculateMatchRewards)(outcome, 0, false, awayWinPoints);
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
    const updatePlayer = async (uid, role) => {
        const rewards = playerRewards.get(uid);
        if (!rewards)
            return;
        const user = await app.prisma.user.findUnique({ where: { id: uid } });
        if (!user)
            return;
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
        await (0, task_service_1.updateTaskProgress)(app, uid, "MATCHES", 1);
        if (result.winner === role)
            await (0, task_service_1.updateTaskProgress)(app, uid, "WINS", 1);
        const userScore = role === "home" ? result.homeScore : result.awayScore;
        const opponentScore = role === "home" ? result.awayScore : result.homeScore;
        if (userScore > 0)
            await (0, task_service_1.updateTaskProgress)(app, uid, "GOALS", userScore);
        if (opponentScore === 0)
            await (0, task_service_1.updateTaskProgress)(app, uid, "CLEAN_SHEETS", 1);
    };
    if (homeId)
        await updatePlayer(homeId, "home");
    if (awayId && !match.isBot)
        await updatePlayer(awayId, "away");
    const recalcTeam = async (teamId) => {
        if (!teamId)
            return;
        try {
            const team = await app.prisma.team.findUnique({
                where: { id: teamId },
                include: { players: { include: { player: true } } },
            });
            if (!team)
                return;
            const starters = team.players
                .filter((tp) => tp.isStarter)
                .map((tp) => ({
                position: tp.player.position,
                role: tp.player.role,
                style: tp.player.style,
                overallRating: tp.player.overallRating,
            }));
            const newRating = (0, synergy_engine_1.calculateTeamRating)(starters);
            await app.prisma.team.update({
                where: { id: teamId },
                data: { rating: newRating },
            });
        }
        catch (err) {
            app.log.warn({ err, teamId }, "Failed to recalc team rating");
        }
    };
    await recalcTeam(match.homeTeamId);
    await recalcTeam(match.awayTeamId);
    // Update season standings if this is a season match
    if (resolvedSeasonId && match.awayTeamId) {
        try {
            const { updateStandings } = await Promise.resolve().then(() => __importStar(require("../season/season.service")));
            await updateStandings(app, resolvedSeasonId, match.homeTeamId, result.homeScore, result.awayScore, result.winner === "home" ? "win" : result.winner === "draw" ? "draw" : "loss");
            await updateStandings(app, resolvedSeasonId, match.awayTeamId, result.awayScore, result.homeScore, result.winner === "away" ? "win" : result.winner === "draw" ? "draw" : "loss");
        }
        catch (err) {
            app.log.warn({ err, matchId: match.id }, "Failed to update season standings");
        }
    }
    // Increment matchesPlayed for all players who participated
    const incrementMatches = async (teamId) => {
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
    const updateStreak = async (uid, role) => {
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
        }
        else {
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
    if (homeId)
        await updateStreak(homeId, "home");
    if (awayId && !match.isBot)
        await updateStreak(awayId, "away");
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
function formatMatchEvents(events) {
    return events.map((e) => {
        let type = e.type.toLowerCase();
        if (type === "yellow_card")
            type = "yellowCard";
        if (type === "red_card")
            type = "redCard";
        if (type === "tactic_change")
            type = "tacticChange";
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
