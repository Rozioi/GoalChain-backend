"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTeamPreview = buildTeamPreview;
exports.buildMatchPreview = buildMatchPreview;
const synergy_engine_1 = require("../player/synergy.engine");
function roleStats(starters) {
    const avgByRole = (roles, fallback = 70) => {
        const list = starters.filter((p) => roles.includes(p.role));
        if (!list.length)
            return fallback;
        return Math.round(list.reduce((acc, p) => acc + p.overallRating, 0) / list.length);
    };
    return {
        attack: avgByRole(["FORWARD"], 70),
        midfield: avgByRole(["MIDFIELDER"], 70),
        defence: avgByRole(["DEFENDER", "GOALKEEPER"], 70),
    };
}
async function buildTeamPreview(app, teamId, isBot = false) {
    const team = await app.prisma.team.findUnique({
        where: { id: teamId },
        include: {
            user: {
                select: {
                    clubName: true,
                    clubIcon: true,
                    points: true,
                },
            },
            players: {
                include: { player: true },
            },
        },
    });
    if (!team)
        return null;
    const allSynergy = team.players.map((tp) => ({
        position: tp.player.position,
        role: tp.player.role,
        style: tp.player.style,
        overallRating: tp.player.overallRating,
    }));
    const starters = team.players
        .filter((tp) => tp.isStarter)
        .map((tp) => ({
        position: tp.player.position,
        role: tp.player.role,
        style: tp.player.style,
        overallRating: tp.player.overallRating,
    }));
    const stats = roleStats(starters.length ? starters : allSynergy.slice(0, 11));
    return {
        teamId: team.id,
        name: team.user?.clubName || team.name,
        ovr: team.rating || (0, synergy_engine_1.calculateTeamRating)(starters),
        publicOvr: (0, synergy_engine_1.calculatePublicRating)(allSynergy),
        clubIcon: team.user?.clubIcon ?? null,
        points: team.user?.points ?? 0,
        isBot,
        ...stats,
    };
}
async function buildMatchPreview(app, match) {
    const home = await buildTeamPreview(app, match.homeTeamId, false);
    const away = match.awayTeamId
        ? await buildTeamPreview(app, match.awayTeamId, match.isBot)
        : null;
    return { home, away };
}
