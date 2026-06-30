import { FastifyInstance } from "fastify";
import { PlayerRole } from "@prisma/client";
import { SCOUTING } from "../../config/constants";
import { env } from "../../config/env";
import { generatePlayer } from "../player/player.generator";
import { beginCell, toNano } from "@ton/core";

/**
 * Подготовка MASTER скаута — только возвращает данные для TON-транзакции.
 * Скаут создаётся ТОЛЬКО после подтверждения оплаты.
 */
export async function prepareMasterScoutPayment(
    app: FastifyInstance,
    userId: string,
    region: string,
    targetRole?: PlayerRole,
    ageMin?: number,
    ageMax?: number,
) {
    const paymentAddress = env.TON_PAYMENT_ADDRESS;
    if (!paymentAddress) {
        throw new Error("TON_PAYMENT_ADDRESS not configured");
    }

    const tierConfig = SCOUTING.TIERS.MASTER;
    if (!tierConfig) throw new Error("Invalid scouting tier");

    const activeScouts = await app.prisma.scout.count({
        where: { userId, status: "ACTIVE" },
    });

    if (activeScouts >= SCOUTING.MAX_ACTIVE_SCOUTS) {
        throw new Error(
            `Maximum active scouts reached (${SCOUTING.MAX_ACTIVE_SCOUTS})`,
        );
    }

    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    // Генерируем временный ID для транзакции
    const tempId = `scout-prepare-${userId}-${Date.now()}`;
    const amountNano = toNano(tierConfig.COST.toString());

    return {
        scoutId: tempId,
        validUntil: Math.floor(Date.now() / 1000) + 240, // 4 min (TON Connect limit ~5 min)
        messages: [
            {
                address: paymentAddress,
                amount: amountNano.toString(),
                payload: beginCell()
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
export async function confirmMasterScoutPayment(
    app: FastifyInstance,
    userId: string,
    region: string,
    targetRole?: PlayerRole,
    ageMin?: number,
    ageMax?: number,
) {
    const tierConfig = SCOUTING.TIERS.MASTER;
    if (!tierConfig) throw new Error("Invalid scouting tier");

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

export async function hireScount(
    app: FastifyInstance,
    userId: string,
    region: string,
    tier: "COMMON" | "PRO" | "MASTER" = "COMMON",
    targetRole?: PlayerRole,
    ageMin?: number,
    ageMax?: number,
) {
    if (!SCOUTING.REGIONS.includes(region)) {
        throw new Error(
            `Invalid region. Choose from: ${SCOUTING.REGIONS.join(", ")}`,
        );
    }

    const tierConfig = (SCOUTING.TIERS as any)[tier];
    if (!tierConfig) throw new Error("Invalid scouting tier");

    // MASTER требует TON-оплаты через prepare/confirm
    if (tier === "MASTER") {
        throw new Error(
            "MASTER tier requires TON payment. Use POST /scout/master/prepare first.",
        );
    }

    const activeScouts = await app.prisma.scout.count({
        where: { userId, status: "ACTIVE" },
    });

    if (activeScouts >= SCOUTING.MAX_ACTIVE_SCOUTS) {
        throw new Error(
            `Maximum active scouts reached (${SCOUTING.MAX_ACTIVE_SCOUTS})`,
        );
    }

    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    if (user.coins < tierConfig.COST) {
        throw new Error(
            `Not enough coins. Need ${tierConfig.COST}, have ${user.coins}`,
        );
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

export async function syncScoutStates(app: FastifyInstance, userId: string) {
    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const scouts = await app.prisma.scout.findMany({
        where: { userId, status: "ACTIVE" },
    });

    const scoutingLevel = user.scoutingLevel || 1;

    await Promise.all(
        scouts.map(async (scout) => {
            if (new Date() >= scout.endsAt) {
                const tierConfig =
                    (SCOUTING.TIERS as any)[scout.tier] ||
                    SCOUTING.TIERS.COMMON;

                const levelBoost = Math.floor((scoutingLevel - 1) / 2);

                const [baseMin, baseMax] = tierConfig.OVR_RANGE;
                const ovrMin = Math.min(45, baseMin + levelBoost);
                const ovrMax = Math.min(79, baseMax + levelBoost);

                const chanceConfig = tierConfig.CHANCE || { min: 50, max: 50 };
                const effectiveChance =
                    chanceConfig.min +
                    Math.floor(
                        Math.random() *
                            (chanceConfig.max - chanceConfig.min + 1),
                    );
                const roll = Math.random() * 100;

                // Если roll НЕ прошёл — результата нет, скаут завершается без игрока
                if (roll >= effectiveChance) {
                    app.log.info(
                        `[Scout] Scout ${scout.id} failed (tier: ${scout.tier}, roll: ${roll.toFixed(1)}%, needed: ${effectiveChance}%)`,
                    );
                    await app.prisma.scout.update({
                        where: { id: scout.id },
                        data: { status: "COMPLETED" },
                    });
                    return;
                }

                // Шанс прошёл — определяем OVR в верхней части диапазона
                const midPoint = ovrMin + Math.floor((ovrMax - ovrMin) * 0.4);

                const generated = await generatePlayer({
                    role: (scout.targetRole as PlayerRole) || undefined,
                    ovrMin: midPoint,
                    ovrMax: ovrMax,
                    seed: `scout-${scout.id}`,
                });

                const player = await app.prisma.player.create({
                    data: {
                        ...generated,
                        ownerId: scout.userId,
                        age: Math.floor(
                            Math.random() * (scout.ageMax - scout.ageMin + 1) +
                                scout.ageMin,
                        ),
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
        }),
    );
}

export async function getScoutResults(app: FastifyInstance, userId: string) {
    await syncScoutStates(app, userId);
    const results = await app.prisma.scout.findMany({
        where: { userId },
        include: { results: { include: { player: true } } },
        orderBy: { createdAt: "desc" },
    });
    return results;
}

export async function collectScoutResult(
    app: FastifyInstance,
    userId: string,
    scoutId: string,
) {
    const scout = await app.prisma.scout.findFirst({
        where: { id: scoutId, userId, status: "COMPLETED" },
        include: { results: { include: { player: true } } },
    });

    if (!scout) throw new Error("Scout not found or not completed");
    if (scout.results.length === 0) throw new Error("No results to collect");

    const team = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
    });

    if (!team) throw new Error("No team found. Complete the draft first.");

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
        players: scout.results.map((r: any) => r.player),
    };
}
