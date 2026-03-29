"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTraining = startTraining;
exports.getTrainingCost = getTrainingCost;
const constants_1 = require("../../config/constants");
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
                ovr: {
                    increment: Math.round(boost / 6), // OVR grows slower
                },
            },
        }),
    ]);
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
    return {
        cost,
        totalTrainings: trainingCount,
        maxOvr,
        currentOvr: teamPlayer?.player.ovr || 0,
        isNft: teamPlayer?.player.isNft || false,
    };
}
