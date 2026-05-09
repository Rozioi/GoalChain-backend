"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hireScount = hireScount;
exports.syncScoutStates = syncScoutStates;
exports.getScoutResults = getScoutResults;
exports.collectScoutResult = collectScoutResult;
const constants_1 = require("../../config/constants");
const player_generator_1 = require("../player/player.generator");
async function hireScount(app, userId, region, tier = "COMMON", targetRole, ageMin, ageMax) {
    if (!constants_1.SCOUTING.REGIONS.includes(region)) {
        throw new Error(`Invalid region. Choose from: ${constants_1.SCOUTING.REGIONS.join(", ")}`);
    }
    const tierConfig = constants_1.SCOUTING.TIERS[tier];
    if (!tierConfig)
        throw new Error("Invalid scouting tier");
    const activeScouts = await app.prisma.scout.count({
        where: { userId, status: "ACTIVE" },
    });
    if (activeScouts >= constants_1.SCOUTING.MAX_ACTIVE_SCOUTS) {
        throw new Error(`Maximum active scouts reached (${constants_1.SCOUTING.MAX_ACTIVE_SCOUTS})`);
    }
    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error("User not found");
    if (tierConfig.CURRENCY === "COIN") {
        if (user.coins < tierConfig.COST) {
            throw new Error(`Not enough coins. Need ${tierConfig.COST}, have ${user.coins}`);
        }
    }
    else if (tierConfig.CURRENCY === "TON") {
        // TON logic would go here. For now, we assume user has it or it's handled via payment event.
        // In many mini-apps, TON payments are verified via webhook before calling the service.
        // However, if we want to support it here, we might need a separate check.
        // For this prototype, let's allow it but log it.
    }
    const endsAt = new Date(Date.now() + constants_1.SCOUTING.DURATION_MS);
    const [scout] = await app.prisma.$transaction([
        app.prisma.scout.create({
            data: {
                userId,
                region,
                targetRole: targetRole || null,
                ageMin: ageMin || 16,
                ageMax: ageMax || 35,
                endsAt,
                tier,
                cost: tierConfig.COST,
                costCurrency: tierConfig.CURRENCY,
            },
        }),
        ...(tierConfig.CURRENCY === "COIN"
            ? [
                app.prisma.user.update({
                    where: { id: userId },
                    data: { coins: { decrement: tierConfig.COST } },
                }),
            ]
            : []),
    ]);
    // Immediately trigger sync for this user to generate the player
    syncScoutStates(app, userId);
    return scout;
}
async function syncScoutStates(app, userId) {
    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        return;
    const scouts = await app.prisma.scout.findMany({
        where: { userId, status: "ACTIVE" },
    });
    const scoutingLevel = user.scoutingLevel || 1;
    await Promise.all(scouts.map(async (scout) => {
        if (new Date() >= scout.endsAt) {
            // Scout completed — generate result
            const tierConfig = constants_1.SCOUTING.TIERS[scout.tier] || constants_1.SCOUTING.TIERS.COMMON;
            const isNft = Math.random() < tierConfig.NFT_CHANCE;
            // Level-based OVR boost (less aggressive now)
            const levelBoost = Math.floor((scoutingLevel - 1) / 2);
            const [baseMin, baseMax] = tierConfig.OVR_RANGE;
            const ovrMin = Math.min(95, baseMin + levelBoost);
            const ovrMax = Math.min(99, baseMax + levelBoost);
            const generated = await (0, player_generator_1.generatePlayer)({
                role: scout.targetRole || undefined,
                ovrMin,
                ovrMax,
                seed: `scout-${scout.id}`,
            });
            const player = await app.prisma.player.create({
                data: {
                    ...generated,
                    isNft,
                    ownerId: scout.userId,
                    age: Math.floor(Math.random() * (scout.ageMax - scout.ageMin + 1) + scout.ageMin),
                },
            });
            await app.prisma.scoutResult.create({
                data: {
                    scoutId: scout.id,
                    playerId: player.id,
                    isNft,
                },
            });
            await app.prisma.scout.update({
                where: { id: scout.id },
                data: { status: "COMPLETED" },
            });
        }
    }));
}
async function getScoutResults(app, userId) {
    await syncScoutStates(app, userId);
    return app.prisma.scout.findMany({
        where: { userId },
        include: { results: { include: { player: true } } },
        orderBy: { createdAt: "desc" },
    });
}
async function collectScoutResult(app, userId, scoutId) {
    const scout = await app.prisma.scout.findFirst({
        where: { id: scoutId, userId, status: "COMPLETED" },
        include: { results: { include: { player: true } } },
    });
    if (!scout)
        throw new Error("Scout not found or not completed");
    if (scout.results.length === 0)
        throw new Error("No results to collect");
    // Add player to team
    const team = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
    });
    if (!team)
        throw new Error("No team found. Complete the draft first.");
    await app.prisma.$transaction(async (tx) => {
        for (const result of scout.results) {
            // Avoid unique constraint error if already collected or in case of double-click
            const exists = await tx.teamPlayer.findUnique({
                where: {
                    teamId_playerId: { teamId: team.id, playerId: result.playerId },
                },
            });
            if (!exists) {
                await tx.teamPlayer.create({
                    data: {
                        teamId: team.id,
                        playerId: result.playerId,
                        isStarter: false,
                    },
                });
            }
        }
        await tx.scout.update({
            where: { id: scoutId },
            data: { status: "COLLECTED" },
        });
    });
    // Scouting growth: +25 EXP per collect
    const EXP_PER_SCOUT = 25;
    const EXP_FOR_LEVEL = 100;
    const currentUser = await app.prisma.user.findUnique({
        where: { id: userId },
    });
    if (currentUser) {
        let newExp = (currentUser.scoutingExp || 0) + EXP_PER_SCOUT;
        let newLevel = currentUser.scoutingLevel || 1;
        while (newExp >= EXP_FOR_LEVEL) {
            newExp -= EXP_FOR_LEVEL;
            newLevel += 1;
        }
        await app.prisma.user.update({
            where: { id: userId },
            data: {
                scoutingExp: newExp,
                scoutingLevel: newLevel,
            },
        });
    }
    return {
        success: true,
        players: scout.results.map((r) => r.player),
    };
}
