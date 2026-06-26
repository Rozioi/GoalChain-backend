"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateMatch = void 0;
exports.getTeamForMatch = getTeamForMatch;
exports.loadTeamsForMatch = loadTeamsForMatch;
const match_simulator_1 = require("./match.simulator");
Object.defineProperty(exports, "simulateMatch", { enumerable: true, get: function () { return match_simulator_1.simulateMatch; } });
async function getTeamForMatch(app, teamId) {
    const team = await app.prisma.team.findUnique({
        where: { id: teamId },
        include: {
            players: { include: { player: true } },
        },
    });
    if (!team)
        throw new Error("Team not found");
    const mapPlayer = (tp) => ({
        id: tp.player.id,
        name: tp.player.name,
        overallRating: tp.player.overallRating,
        pace: tp.player.pace,
        shooting: tp.player.shooting,
        passing: tp.player.passing,
        dribbling: tp.player.dribbling,
        defending: tp.player.defending,
        physical: tp.player.physical,
        goalkeeping: tp.player.goalkeeping,
        formValue: tp.player.formValue,
        fatigue: tp.player.fatigue,
        position: tp.player.position,
        role: tp.player.role,
        style: tp.player.style,
    });
    return {
        rating: team.rating,
        formation: team.formation,
        starters: team.players.filter((tp) => tp.isStarter).map(mapPlayer),
        bench: team.players.filter((tp) => !tp.isStarter).map(mapPlayer),
        pressingType: "MEDIUM",
    };
}
async function loadTeamsForMatch(app, homeTeamId, awayTeamId, homePressing = "MEDIUM", awayPressing = "MEDIUM") {
    const homeTeamData = await getTeamForMatch(app, homeTeamId);
    const awayTeamData = await getTeamForMatch(app, awayTeamId);
    homeTeamData.pressingType = homePressing;
    awayTeamData.pressingType = awayPressing;
    return { homeTeamData, awayTeamData };
}
