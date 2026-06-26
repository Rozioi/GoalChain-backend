"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMatchCompletion = handleMatchCompletion;
exports.formatMatchEvents = formatMatchEvents;
const constants_1 = require("../../config/constants");
const task_service_1 = require("../task/task.service");
const synergy_engine_1 = require("../player/synergy.engine");
async function handleMatchCompletion(app, match, result, seed) {
    const homeCoins = result.winner === "home"
        ? constants_1.MATCH.REWARDS.WIN_COINS
        : result.winner === "draw"
            ? constants_1.MATCH.REWARDS.DRAW_COINS
            : constants_1.MATCH.REWARDS.LOSS_COINS;
    const awayCoins = result.winner === "away"
        ? constants_1.MATCH.REWARDS.WIN_COINS
        : result.winner === "draw"
            ? constants_1.MATCH.REWARDS.DRAW_COINS
            : constants_1.MATCH.REWARDS.LOSS_COINS;
    const homeExp = result.winner === "home"
        ? constants_1.MATCH.REWARDS.WIN_EXP
        : result.winner === "draw"
            ? constants_1.MATCH.REWARDS.DRAW_EXP
            : constants_1.MATCH.REWARDS.LOSS_EXP;
    const awayExp = result.winner === "away"
        ? constants_1.MATCH.REWARDS.WIN_EXP
        : result.winner === "draw"
            ? constants_1.MATCH.REWARDS.DRAW_EXP
            : constants_1.MATCH.REWARDS.LOSS_EXP;
    await app.prisma.match.update({
        where: { id: match.id },
        data: {
            status: "COMPLETED",
            homeScore: result.homeScore,
            awayScore: result.awayScore,
            seed,
            homeCoins,
            awayCoins,
            homeExp,
            awayExp,
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
    const homeId = match.homeUserId;
    const awayId = match.awayUserId;
    const updatePlayer = async (uid, role) => {
        const coins = result.winner === role
            ? constants_1.MATCH.REWARDS.WIN_COINS
            : result.winner === "draw"
                ? constants_1.MATCH.REWARDS.DRAW_COINS
                : constants_1.MATCH.REWARDS.LOSS_COINS;
        const exp = result.winner === role
            ? constants_1.MATCH.REWARDS.WIN_EXP
            : result.winner === "draw"
                ? constants_1.MATCH.REWARDS.DRAW_EXP
                : constants_1.MATCH.REWARDS.LOSS_EXP;
        const points = result.winner === role ? 25 : result.winner === "draw" ? 10 : -15;
        const user = await app.prisma.user.findUnique({ where: { id: uid } });
        if (!user)
            return;
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
    return { homeCoins, awayCoins, homeExp, awayExp };
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
