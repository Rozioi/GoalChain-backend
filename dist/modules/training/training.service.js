"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTraining = startTraining;
exports.getTrainingCost = getTrainingCost;
const constants_1 = require("../../config/constants");
const synergy_engine_1 = require("../player/synergy.engine");
async function startTraining(app, userId, playerId, stat) {
    const validStats = [
        "pace", "shooting", "passing", "dribbling", "defending", "physical",
    ];
    if (!validStats.includes(stat)) {
        throw new Error(`Invalid stat: ${stat}. Must be one of: ${validStats.join(", ")}`);
    }
    // Check player belongs to user's team
    const teamPlayer = await app.prisma.teamPlayer.findFirst({
        where: {
            player: { id: playerId },
            team: { userId, isEvent: false },
        },
        include: { player: true },
    });
    if (!teamPlayer)
        throw new Error("Player not on your team");
    // Check if rented out
    const playerWithRent = await app.prisma.player.findUnique({
        where: { id: playerId },
        include: { rent: true }
    });
    if (playerWithRent?.rent?.isRented && playerWithRent.rent.rentedById !== userId) {
        throw new Error("Cannot train a player that is currently rented out");
    }
    // Check trauma
    if (teamPlayer.player.injuryEndsAt && new Date() < new Date(teamPlayer.player.injuryEndsAt)) {
        throw new Error(`Player is traumatized until ${teamPlayer.player.injuryEndsAt.toISOString()}`);
    }
    // Check cooldown
    const lastTraining = await app.prisma.training.findFirst({
        where: { userId, playerId, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
    });
    if (lastTraining) {
        const cooldownEnd = new Date(lastTraining.createdAt.getTime() + constants_1.TRAINING.COOLDOWN_MS);
        if (new Date() < cooldownEnd) {
            throw new Error(`Training on cooldown. Available at ${cooldownEnd.toISOString()}`);
        }
    }
    // Check max OVR
    const maxOvr = teamPlayer.player.isNft
        ? constants_1.TRAINING.MAX_OVR_NFT
        : constants_1.TRAINING.MAX_OVR_NORMAL;
    const currentStatValue = teamPlayer.player[stat];
    if (currentStatValue >= maxOvr) {
        throw new Error(`${stat} is already at maximum (${maxOvr})`);
    }
    // Calculate cost
    const trainingCount = await app.prisma.training.count({
        where: { userId, playerId },
    });
    const cost = Math.floor(constants_1.TRAINING.BASE_COST * Math.pow(constants_1.TRAINING.COST_MULTIPLIER, trainingCount));
    // Check coins
    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.coins < cost) {
        throw new Error(`Not enough coins. Need ${cost}, have ${user?.coins || 0}`);
    }
    const boost = teamPlayer.player.isNft
        ? constants_1.TRAINING.BOOST_NFT
        : constants_1.TRAINING.BOOST_NORMAL;
    const endsAt = new Date(Date.now() + constants_1.TRAINING.COOLDOWN_MS);
    // Execute training
    const [training] = await app.prisma.$transaction([
        app.prisma.training.create({
            data: {
                userId,
                playerId,
                stat,
                boost,
                cost,
                status: "COMPLETED",
                endsAt,
            },
        }),
        app.prisma.user.update({
            where: { id: userId },
            data: { coins: { decrement: cost } },
        }),
        app.prisma.player.update({
            where: { id: playerId },
            data: {
                [stat]: { increment: boost },
                overallRating: {
                    increment: Math.round(boost / 6), // overallRating grows slower
                },
            },
        }),
    ]);
    // Recalculate team rating if the player is a starter
    if (teamPlayer.isStarter) {
        const team = await app.prisma.team.findUnique({
            where: { id: teamPlayer.teamId },
            include: {
                players: {
                    where: { isStarter: true },
                    include: { player: true },
                },
            },
        });
        if (team) {
            const starters = team.players.map((tp) => ({
                position: tp.player.position,
                role: tp.player.role,
                style: tp.player.style,
                overallRating: tp.player.overallRating,
            }));
            const rating = (0, synergy_engine_1.calculateTeamRating)(starters);
            await app.prisma.team.update({
                where: { id: team.id },
                data: { rating },
            });
        }
    }
    return {
        training,
        stat,
        boost,
        cost,
        newStatValue: currentStatValue + boost,
    };
}
async function getTrainingCost(app, userId, playerId) {
    const trainingCount = await app.prisma.training.count({
        where: { userId, playerId },
    });
    const cost = Math.floor(constants_1.TRAINING.BASE_COST * Math.pow(constants_1.TRAINING.COST_MULTIPLIER, trainingCount));
    const teamPlayer = await app.prisma.teamPlayer.findFirst({
        where: {
            player: { id: playerId },
            team: { userId, isEvent: false },
        },
        include: { player: true },
    });
    const maxOvr = teamPlayer?.player.isNft
        ? constants_1.TRAINING.MAX_OVR_NFT
        : constants_1.TRAINING.MAX_OVR_NORMAL;
    // Check last training for cooldown
    const lastTraining = await app.prisma.training.findFirst({
        where: { userId, playerId, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
    });
    let cooldownEndsAt = null;
    if (lastTraining) {
        const potentialEnd = new Date(lastTraining.createdAt.getTime() + constants_1.TRAINING.COOLDOWN_MS);
        if (new Date() < potentialEnd) {
            cooldownEndsAt = potentialEnd;
        }
    }
    return {
        cost,
        totalTrainings: trainingCount,
        maxOvr,
        currentOverallRating: teamPlayer?.player.overallRating || 0,
        isNft: teamPlayer?.player.isNft || false,
        cooldownEndsAt,
        lastTrainedStat: lastTraining?.stat || null,
    };
}
