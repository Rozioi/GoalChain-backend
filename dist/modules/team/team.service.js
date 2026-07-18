"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyTeam = getMyTeam;
exports.updateLineup = updateLineup;
exports.substitutePlayer = substitutePlayer;
exports.getTeamRating = getTeamRating;
const synergy_engine_1 = require("../player/synergy.engine");
async function getMyTeam(app, userId) {
    const team = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
        include: {
            players: {
                include: { player: true },
                orderBy: [
                    { isStarter: "desc" },
                    { positionInFormation: "asc" },
                ],
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
    const allPlayers = team.players.map((tp) => ({
        position: tp.player.position,
        role: tp.player.role,
        style: tp.player.style,
        overallRating: tp.player.overallRating,
    }));
    const publicOvr = (0, synergy_engine_1.calculatePublicRating)(allPlayers);
    return {
        ...team,
        starters,
        reserves,
        synergy,
        ovr: team.rating,
        publicOvr,
    };
}
async function updateLineup(app, userId, starters, formation) {
    const team = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
        include: { players: { include: { player: true } } },
    });
    if (!team)
        throw new Error("No team found");
    if (starters.length !== 11)
        throw new Error("Must have exactly 11 starters");
    const teamPlayerIds = team.players.map((tp) => tp.playerId);
    for (const s of starters) {
        if (!teamPlayerIds.includes(s.playerId)) {
            throw new Error(`Player ${s.playerId} is not on your team`);
        }
    }
    // Валидация: ровно один GK в стартовом составе
    let gkCount = 0;
    for (const s of starters) {
        if (s.slotKey === "gk")
            gkCount++;
    }
    if (gkCount !== 1) {
        throw new Error("Team must have exactly one Goalkeeper in the starting lineup");
    }
    await app.prisma.teamPlayer.updateMany({
        where: { teamId: team.id },
        data: { isStarter: false, positionInFormation: null },
    });
    for (const s of starters) {
        await app.prisma.teamPlayer.update({
            where: { teamId_playerId: { teamId: team.id, playerId: s.playerId } },
            data: {
                isStarter: true,
                positionInFormation: s.slotKey,
            },
        });
    }
    if (formation) {
        await app.prisma.team.update({
            where: { id: team.id },
            data: { formation },
        });
    }
    const starterPlayerIds = starters.map((s) => s.playerId);
    const starterPlayers = await app.prisma.player.findMany({
        where: { id: { in: starterPlayerIds } },
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
    return await getMyTeam(app, userId);
}
async function substitutePlayer(app, userId, outPlayerId, inPlayerId, slotKey) {
    const team = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
        include: { players: { include: { player: true } } },
    });
    if (!team)
        throw new Error("No team found");
    const outTP = team.players.find((tp) => tp.playerId === outPlayerId);
    const inTP = team.players.find((tp) => tp.playerId === inPlayerId);
    if (!outTP)
        throw new Error("Player to substitute out not found in team");
    if (!inTP)
        throw new Error("Player to substitute in not found in team");
    if (!outTP.isStarter)
        throw new Error("Player to substitute out is not a starter");
    if (inTP.isStarter)
        throw new Error("Player to substitute in is already a starter");
    // Swap: out → bench, in → starter with the slotKey
    await app.prisma.teamPlayer.update({
        where: { teamId_playerId: { teamId: team.id, playerId: outPlayerId } },
        data: { isStarter: false, positionInFormation: null },
    });
    await app.prisma.teamPlayer.update({
        where: { teamId_playerId: { teamId: team.id, playerId: inPlayerId } },
        data: { isStarter: true, positionInFormation: slotKey },
    });
    // Recalc team rating
    const starters = await app.prisma.teamPlayer.findMany({
        where: { teamId: team.id, isStarter: true },
        include: { player: true },
    });
    const rating = (0, synergy_engine_1.calculateTeamRating)(starters.map((tp) => ({
        position: tp.player.position,
        role: tp.player.role,
        style: tp.player.style,
        overallRating: tp.player.overallRating,
    })));
    await app.prisma.team.update({
        where: { id: team.id },
        data: { rating },
    });
    return await getMyTeam(app, userId);
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
