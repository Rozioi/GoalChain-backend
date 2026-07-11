"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareMasterScoutPayment = prepareMasterScoutPayment;
exports.confirmMasterScoutPayment = confirmMasterScoutPayment;
exports.hireScount = hireScount;
exports.syncScoutStates = syncScoutStates;
exports.getScoutResults = getScoutResults;
exports.collectScoutResult = collectScoutResult;
const constants_1 = require("../../config/constants");
const env_1 = require("../../config/env");
const player_generator_1 = require("../player/player.generator");
const core_1 = require("@ton/core");
/**
 * Подготовка MASTER скаута — только возвращает данные для TON-транзакции.
 * Скаут создаётся ТОЛЬКО после подтверждения оплаты.
 */
async function prepareMasterScoutPayment(app, userId, region, targetRole, ageMin, ageMax) {
    const paymentAddress = env_1.env.TON_PAYMENT_ADDRESS;
    if (!paymentAddress) {
        throw new Error("TON_PAYMENT_ADDRESS not configured");
    }
    const tierConfig = constants_1.SCOUTING.TIERS.MASTER;
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
    // Генерируем временный ID для транзакции
    const tempId = `scout-prepare-${userId}-${Date.now()}`;
    const amountNano = (0, core_1.toNano)(tierConfig.COST.toString());
    return {
        scoutId: tempId,
        validUntil: Math.floor(Date.now() / 1000) + 240, // 4 min (TON Connect limit ~5 min)
        messages: [
            {
                address: paymentAddress,
                amount: amountNano.toString(),
                payload: (0, core_1.beginCell)()
                    .storeStringTail(`scout:${userId}:${region}`)
                    .endCell()
                    .toBoc()
                    .toString("base64"),
            },
        ],
        region,
        targetRole,
        ageMin: ageMin || 16,
        ageMax: ageMax || 35,
    };
}
/**
 * Создание MASTER скаута ПОСЛЕ успешной TON-транзакции.
 */
async function confirmMasterScoutPayment(app, userId, region, targetRole, ageMin, ageMax) {
    const tierConfig = constants_1.SCOUTING.TIERS.MASTER;
    if (!tierConfig)
        throw new Error("Invalid scouting tier");
    const endsAt = new Date();
    const scout = await app.prisma.scout.create({
        data: {
            userId,
            region,
            targetRole: targetRole || null,
            ageMin: ageMin || 16,
            ageMax: ageMax || 35,
            endsAt,
            tier: "MASTER",
            cost: tierConfig.COST,
            costCurrency: tierConfig.CURRENCY,
            status: "ACTIVE",
        },
    });
    await app.prisma.economyLog.create({
        data: {
            userId,
            amount: -tierConfig.COST,
            source: "SCOUTING_COST",
            details: { tier: "MASTER", region },
        },
    });
    await syncScoutStates(app, userId);
    const updated = await app.prisma.scout.findUnique({
        where: { id: scout.id },
        include: { results: { include: { player: true } } },
    });
    return updated ?? scout;
}
async function hireScount(app, userId, region, tier = "COMMON", targetRole, ageMin, ageMax) {
    if (!constants_1.SCOUTING.REGIONS.includes(region)) {
        throw new Error(`Invalid region. Choose from: ${constants_1.SCOUTING.REGIONS.join(", ")}`);
    }
    const tierConfig = constants_1.SCOUTING.TIERS[tier];
    if (!tierConfig)
        throw new Error("Invalid scouting tier");
    // MASTER требует TON-оплаты через prepare/confirm
    if (tier === "MASTER") {
        throw new Error("MASTER tier requires TON payment. Use POST /scout/master/prepare first.");
    }
    const activeScouts = await app.prisma.scout.count({
        where: { userId, status: "ACTIVE" },
    });
    if (activeScouts >= constants_1.SCOUTING.MAX_ACTIVE_SCOUTS) {
        throw new Error(`Maximum active scouts reached (${constants_1.SCOUTING.MAX_ACTIVE_SCOUTS})`);
    }
    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error("User not found");
    if (user.coins < tierConfig.COST) {
        throw new Error(`Not enough coins. Need ${tierConfig.COST}, have ${user.coins}`);
    }
    const endsAt = new Date();
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
        app.prisma.user.update({
            where: { id: userId },
            data: { coins: { decrement: tierConfig.COST } },
        }),
        app.prisma.economyLog.create({
            data: {
                userId,
                amount: -tierConfig.COST,
                source: "SCOUTING_COST",
                details: { tier, region },
            },
        }),
    ]);
    await syncScoutStates(app, userId);
    const updated = await app.prisma.scout.findUnique({
        where: { id: scout.id },
        include: { results: { include: { player: true } } },
    });
    return updated ?? scout;
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
            const tierConfig = constants_1.SCOUTING.TIERS[scout.tier] ||
                constants_1.SCOUTING.TIERS.COMMON;
            const levelBoost = Math.floor((scoutingLevel - 1) / 2);
            const [baseMin, baseMax] = tierConfig.OVR_RANGE;
            const ovrMin = Math.max(45, Math.min(baseMin + levelBoost, 99));
            const ovrMax = Math.max(ovrMin, Math.min(baseMax + levelBoost, 99));
            // OVR равномерно в диапазоне (всегда успех)
            const ovr = ovrMin + Math.floor(Math.random() * (ovrMax - ovrMin + 1));
            const generated = await (0, player_generator_1.generatePlayer)({
                role: scout.targetRole || undefined,
                ovrMin: ovr,
                ovrMax: ovr,
                seed: `scout-${scout.id}`,
            });
            const player = await app.prisma.player.create({
                data: {
                    ...generated,
                    ownerId: scout.userId,
                    age: Math.floor(Math.random() * (scout.ageMax - scout.ageMin + 1) +
                        scout.ageMin),
                },
            });
            await app.prisma.scoutResult.create({
                data: {
                    scoutId: scout.id,
                    playerId: player.id,
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
    const results = await app.prisma.scout.findMany({
        where: { userId },
        include: { results: { include: { player: true } } },
        orderBy: { createdAt: "desc" },
    });
    return results;
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
    const team = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
    });
    if (!team)
        throw new Error("No team found. Complete the draft first.");
    await app.prisma.$transaction(async (tx) => {
        for (const result of scout.results) {
            const exists = await tx.teamPlayer.findUnique({
                where: {
                    teamId_playerId: {
                        teamId: team.id,
                        playerId: result.playerId,
                    },
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
