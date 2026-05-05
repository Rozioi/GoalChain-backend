import { FastifyInstance } from "fastify";
import { generateMultiplePlayers } from "../player/player.generator";
import { PlayerRole } from "@prisma/client";

export async function generateBotTeam(
  app: FastifyInstance,
  targetRating: number,
) {
  const ovrMin = Math.max(40, Math.round(targetRating - 10));
  const ovrMax = Math.min(95, Math.round(targetRating + 5));

  const gk = generateMultiplePlayers(1, {
    role: "GOALKEEPER" as PlayerRole,
    ovrMin,
    ovrMax,
    seed: `bot-gk-${Date.now()}`,
  });
  const def = generateMultiplePlayers(4, {
    role: "DEFENDER" as PlayerRole,
    ovrMin,
    ovrMax,
    seed: `bot-def-${Date.now()}`,
  });
  const mid = generateMultiplePlayers(4, {
    role: "MIDFIELDER" as PlayerRole,
    ovrMin,
    ovrMax,
    seed: `bot-mid-${Date.now()}`,
  });
  const fwd = generateMultiplePlayers(2, {
    role: "FORWARD" as PlayerRole,
    ovrMin,
    ovrMax,
    seed: `bot-fwd-${Date.now()}`,
  });

  const allPlayers = [...gk, ...def, ...mid, ...fwd];

  let botUser = await app.prisma.user.findUnique({
    where: { telegramId: "bot-system" },
  });

  if (!botUser) {
    botUser = await app.prisma.user.create({
      data: {
        telegramId: "bot-system",
        username: "bot_system",
        firstName: "Bot",
        lastName: "System",
        referralCode: "BOT-SYSTEM-CODE",
      },
    });
  }

  const team = await app.prisma.team.create({
    data: {
      name: `Bot Team (${Math.round(targetRating)})`,
      userId: botUser.id,
      rating: targetRating,
      formation: "4-4-2",
    },
  });

  const starters = [];
  for (const gp of allPlayers) {
    const player = await app.prisma.player.create({ data: gp });
    await app.prisma.teamPlayer.create({
      data: {
        teamId: team.id,
        playerId: player.id,
        isStarter: true,
        positionInFormation: gp.position,
      },
    });
    starters.push(player);
  }

  return { team, starters };
}
