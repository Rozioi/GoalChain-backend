"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupBotData = cleanupBotData;
async function cleanupBotData(app) {
    app.log.info("Starting bot data cleanup...");
    const botUser = await app.prisma.user.findUnique({
        where: { telegramId: "bot-system" },
    });
    if (!botUser) {
        app.log.info("No bot user found, skipping cleanup.");
        return;
    }
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oldBotTeams = await app.prisma.team.findMany({
        where: {
            userId: botUser.id,
            createdAt: { lt: oneDayAgo },
        },
        select: { id: true },
    });
    if (oldBotTeams.length === 0) {
        app.log.info("No old bot teams to cleanup.");
        return;
    }
    const teamIds = oldBotTeams.map((t) => t.id);
    const teamPlayers = await app.prisma.teamPlayer.findMany({
        where: { teamId: { in: teamIds } },
        select: { playerId: true },
    });
    const playerIds = teamPlayers.map((tp) => tp.playerId);
    await app.prisma.teamPlayer.deleteMany({
        where: { teamId: { in: teamIds } },
    });
    const deletedTeams = await app.prisma.team.deleteMany({
        where: { id: { in: teamIds } },
    });
    const deletedPlayers = await app.prisma.player.deleteMany({
        where: {
            id: { in: playerIds },
            isNft: false,
            ownerId: null,
        },
    });
    app.log.info(`Cleanup finished. Deleted ${deletedTeams.count} teams and ${deletedPlayers.count} players.`);
}
