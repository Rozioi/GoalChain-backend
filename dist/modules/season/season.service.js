"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentSeason = getCurrentSeason;
exports.getSeasonStandings = getSeasonStandings;
exports.registerForSeason = registerForSeason;
exports.updateStandings = updateStandings;
exports.createSeason = createSeason;
const constants_1 = require("../../config/constants");
async function getCurrentSeason(app) {
    return app.prisma.season.findFirst({
        where: { status: { in: ["ACTIVE", "PLAYOFFS"] } },
        include: {
            standings: {
                include: { team: true },
                orderBy: [{ points: "desc" }, { goalsFor: "desc" }],
            },
        },
    });
}
async function getSeasonStandings(app, seasonId) {
    return app.prisma.seasonStanding.findMany({
        where: { seasonId },
        include: { team: true },
        orderBy: [{ points: "desc" }, { goalsFor: "desc" }],
    });
}
async function registerForSeason(app, userId) {
    const season = await app.prisma.season.findFirst({
        where: { status: "UPCOMING" },
    });
    if (!season)
        throw new Error("No upcoming season");
    const team = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
    });
    if (!team)
        throw new Error("No team. Complete draft first.");
    // Check if already registered
    const existing = await app.prisma.seasonStanding.findUnique({
        where: { seasonId_teamId: { seasonId: season.id, teamId: team.id } },
    });
    if (existing)
        throw new Error("Already registered for this season");
    const standing = await app.prisma.seasonStanding.create({
        data: {
            seasonId: season.id,
            teamId: team.id,
        },
    });
    return { season, standing };
}
async function updateStandings(app, seasonId, teamId, goalsFor, goalsAgainst, result) {
    const update = {
        played: { increment: 1 },
        goalsFor: { increment: goalsFor },
        goalsAgainst: { increment: goalsAgainst },
    };
    if (result === "win") {
        update.wins = { increment: 1 };
        update.points = { increment: 3 };
    }
    else if (result === "draw") {
        update.draws = { increment: 1 };
        update.points = { increment: 1 };
    }
    else {
        update.losses = { increment: 1 };
    }
    return app.prisma.seasonStanding.update({
        where: { seasonId_teamId: { seasonId, teamId } },
        data: update,
    });
}
async function createSeason(app, name, division) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + constants_1.SEASON.DURATION_WEEKS * 7);
    return app.prisma.season.create({
        data: {
            name,
            division,
            status: "UPCOMING",
            startDate,
            endDate,
        },
    });
}
