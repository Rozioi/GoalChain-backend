"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyTeam = getMyTeam;
exports.updateLineup = updateLineup;
exports.getTeamRating = getTeamRating;
const synergy_engine_1 = require("../player/synergy.engine");
async function getMyTeam(app, userId) {
    const team = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
        include: {
            players: {
                include: { player: true },
                orderBy: [{ isStarter: "desc" }, { positionInFormation: "asc" }],
            },
        },
    });
    if (!team)
        throw new Error("No team found. Complete the draft first.");
    const starters = team.players.filter((tp) => tp.isStarter);
    const reserves = team.players.filter((tp) => !tp.isStarter);
    const synergy = (0, synergy_engine_1.calculateTeamSynergy)(starters.map((tp) => ({
        position: tp.player.position,
        role: tp.player.role,
        style: tp.player.style,
        overallRating: tp.player.overallRating,
    })));
    return {
        ...team,
        starters,
        reserves,
        synergy,
    };
}
async function updateLineup(app, userId, starterIds, formation) {
    const team = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
        include: { players: true },
    });
    if (!team)
        throw new Error("No team found");
    if (starterIds.length !== 11)
        throw new Error("Must have exactly 11 starters");
    // Validate all IDs belong to team
    const teamPlayerIds = team.players.map((tp) => tp.playerId);
    for (const id of starterIds) {
        if (!teamPlayerIds.includes(id)) {
            throw new Error(`Player ${id} is not on your team`);
        }
    }
    // Reset all to reserve
    await app.prisma.teamPlayer.updateMany({
        where: { teamId: team.id },
        data: { isStarter: false, positionInFormation: null },
    });
    // Set starters
    for (const playerId of starterIds) {
        const player = await app.prisma.player.findUnique({
            where: { id: playerId },
        });
        await app.prisma.teamPlayer.update({
            where: { teamId_playerId: { teamId: team.id, playerId } },
            data: {
                isStarter: true,
                positionInFormation: player?.position || null,
            },
        });
    }
    // Update formation if provided
    if (formation) {
        await app.prisma.team.update({
            where: { id: team.id },
            data: { formation },
        });
    }
    // Recalculate rating
    const starterPlayers = await app.prisma.player.findMany({
        where: { id: { in: starterIds } },
    });
    const rating = (0, synergy_engine_1.calculateTeamRating)(starterPlayers.map((p) => ({
        position: p.position,
        role: p.role,
        style: p.style,
        overallRating: p.overallRating,
    })));
    await app.prisma.team.update({
        where: { id: team.id },
        data: { rating },
    });
    return { success: true, rating };
}
async function getTeamRating(app, userId) {
    const team = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
        include: {
            players: {
                where: { isStarter: true },
                include: { player: true },
            },
        },
    });
    if (!team)
        throw new Error("No team found");
    const starters = team.players.map((tp) => ({
        position: tp.player.position,
        role: tp.player.role,
        style: tp.player.style,
        overallRating: tp.player.overallRating,
    }));
    const rating = (0, synergy_engine_1.calculateTeamRating)(starters);
    const synergy = (0, synergy_engine_1.calculateTeamSynergy)(starters);
    return { rating, synergy, formation: team.formation };
}
