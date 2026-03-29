"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hireScount = hireScount;
exports.getScoutResults = getScoutResults;
exports.collectScoutResult = collectScoutResult;
const constants_1 = require("../../config/constants");
const player_generator_1 = require("../player/player.generator");
async function hireScount(app, userId, region, targetRole, ageMin, ageMax) {
    if (!constants_1.SCOUTING.REGIONS.includes(region)) {
        throw new Error(`Invalid region. Choose from: ${constants_1.SCOUTING.REGIONS.join(", ")}`);
    }
    // Check active scouts limit
    const activeScouts = await app.prisma.scout.count({
        where: { userId, status: "ACTIVE" },
    });
    if (activeScouts >= constants_1.SCOUTING.MAX_ACTIVE_SCOUTS) {
        throw new Error(`Maximum active scouts reached (${constants_1.SCOUTING.MAX_ACTIVE_SCOUTS})`);
    }
    // Check coins
    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.coins < constants_1.SCOUTING.COST) {
        throw new Error(`Not enough coins. Need ${constants_1.SCOUTING.COST}, have ${user?.coins || 0}`);
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
            },
        }),
        app.prisma.user.update({
            where: { id: userId },
            data: { coins: { decrement: constants_1.SCOUTING.COST } },
        }),
    ]);
    return scout;
}
async function getScoutResults(app, userId) {
    const scouts = await app.prisma.scout.findMany({
        where: { userId },
        include: { results: { include: { player: true } } },
        orderBy: { createdAt: "desc" },
    });
    // Process completed scouts
    for (const scout of scouts) {
        if (scout.status === "ACTIVE" && new Date() >= scout.endsAt) {
            // Scout completed — generate result
            const isNft = Math.random() < constants_1.SCOUTING.NFT_CHANCE;
            const generated = (0, player_generator_1.generatePlayer)({
                role: scout.targetRole || undefined,
                ovrMin: isNft ? 70 : 50,
                ovrMax: isNft ? 90 : 70,
                seed: `scout-${scout.id}`,
            });
            const player = await app.prisma.player.create({
                data: {
                    ...generated,
                    isNft,
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
    }
    // Refetch with results
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
    for (const result of scout.results) {
        await app.prisma.teamPlayer.create({
            data: {
                teamId: team.id,
                playerId: result.playerId,
                isStarter: false,
            },
        });
    }
    await app.prisma.scout.update({
        where: { id: scoutId },
        data: { status: "COLLECTED" },
    });
    return {
        success: true,
        players: scout.results.map((r) => r.player),
    };
}
