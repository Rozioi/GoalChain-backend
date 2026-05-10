import { FastifyInstance } from "fastify";

export async function cleanupBotData(app: FastifyInstance) {
  app.log.info("Starting bot data cleanup...");

  // Find the bot system user
  const botUser = await app.prisma.user.findUnique({
    where: { telegramId: "bot-system" },
  });

  if (!botUser) {
    app.log.info("No bot user found, skipping cleanup.");
    return;
  }

  // Delete old bot teams and their players
  // We keep teams created in the last 24 hours to avoid deleting active match data
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

  // Prisma doesn't always cascade complex relations perfectly in all setups, 
  // so we'll do it explicitly for safety.
  
  // 1. Find all players belonging to these teams
  const teamPlayers = await app.prisma.teamPlayer.findMany({
    where: { teamId: { in: teamIds } },
    select: { playerId: true },
  });
  
  const playerIds = teamPlayers.map(tp => tp.playerId);

  // 2. Delete team-player relations
  await app.prisma.teamPlayer.deleteMany({
    where: { teamId: { in: teamIds } },
  });

  // 3. Delete the teams
  const deletedTeams = await app.prisma.team.deleteMany({
    where: { id: { in: teamIds } },
  });

  // 4. Delete the players (only those that are NOT NFTs and NOT owned by real users)
  const deletedPlayers = await app.prisma.player.deleteMany({
    where: {
      id: { in: playerIds },
      isNft: false,
      ownerId: null,
    },
  });

  app.log.info(`Cleanup finished. Deleted ${deletedTeams.count} teams and ${deletedPlayers.count} players.`);
}
