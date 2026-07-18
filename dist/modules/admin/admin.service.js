"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastMessage = void 0;
exports.getGlobalStats = getGlobalStats;
exports.listUsers = listUsers;
exports.updateUser = updateUser;
exports.createSeason = createSeason;
exports.updateSeasonStatus = updateSeasonStatus;
exports.listSeasons = listSeasons;
exports.endSeason = endSeason;
exports.deleteUser = deleteUser;
exports.deleteUserTeam = deleteUserTeam;
exports.getRealPlayerTemplates = getRealPlayerTemplates;
exports.getReleasedRealPlayers = getReleasedRealPlayers;
exports.releaseRealPlayerByTemplate = releaseRealPlayerByTemplate;
async function getGlobalStats(app) {
    const [userCount, teamCount, matchCount, totalCoins] = await Promise.all([
        app.prisma.user.count(),
        app.prisma.team.count(),
        app.prisma.match.count(),
        app.prisma.user.aggregate({ _sum: { coins: true } }),
    ]);
    return {
        users: userCount,
        teams: teamCount,
        matches: matchCount,
        economy: totalCoins._sum.coins || 0,
        timestamp: new Date().toISOString(),
    };
}
async function listUsers(app, query) {
    const { search, skip = 0, take = 50 } = query;
    const where = search
        ? {
            OR: [
                {
                    username: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    firstName: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                { telegramId: { contains: search } },
            ],
        }
        : {};
    const [users, total] = await Promise.all([
        app.prisma.user.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: "desc" },
        }),
        app.prisma.user.count({ where }),
    ]);
    return { users, total };
}
async function updateUser(app, userId, data) {
    return app.prisma.user.update({
        where: { id: userId },
        data,
    });
}
async function createSeason(app, data) {
    return app.prisma.season.create({
        data: {
            ...data,
            status: "UPCOMING",
        },
    });
}
async function updateSeasonStatus(app, seasonId, status) {
    return app.prisma.season.update({
        where: { id: seasonId },
        data: { status },
    });
}
async function listSeasons(app) {
    return app.prisma.season.findMany({
        orderBy: { createdAt: "desc" },
    });
}
const season_service_1 = require("../season/season.service");
const broadcast_service_1 = require("./broadcast.service");
Object.defineProperty(exports, "broadcastMessage", { enumerable: true, get: function () { return broadcast_service_1.broadcastMessage; } });
const real_player_service_1 = require("../player/real-player.service");
async function endSeason(app, seasonId) {
    return (0, season_service_1.endSeason)(app, seasonId);
}
async function deleteUser(app, userId) {
    await app.prisma.user.delete({
        where: { id: userId },
    });
    return { success: true };
}
async function deleteUserTeam(app, userId) {
    const teams = await app.prisma.team.findMany({
        where: { userId },
        select: { id: true },
    });
    const teamIds = teams.map((t) => t.id);
    await app.prisma.$transaction([
        app.prisma.teamPlayer.deleteMany({
            where: { teamId: { in: teamIds } },
        }),
        app.prisma.team.deleteMany({
            where: { userId },
        }),
    ]);
    return { success: true };
}
async function getRealPlayerTemplates(app) {
    return (0, real_player_service_1.listRealPlayerTemplates)(app);
}
async function getReleasedRealPlayers(app) {
    return (0, real_player_service_1.listReleasedRealPlayers)(app);
}
async function releaseRealPlayerByTemplate(app, templateId) {
    return (0, real_player_service_1.releaseRealPlayer)(app, templateId);
}
