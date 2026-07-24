import { FastifyInstance } from "fastify";
import { recalculateFatigue, applyFatigueRegenToPlayer } from "../match/fatigue.system";

async function getPlayerImage(app: FastifyInstance, playerId: string) {
  const player = await app.prisma.player.findUnique({
    where: { id: playerId },
  });

  if (!player) throw new Error("Player not found");

  // Если карточка не сгенерирована — показываем IPFS-аватар
  return player.imageUrl || player.face;
}

async function getPlayerById(app: FastifyInstance, playerId: string) {
  const player = await app.prisma.player.findUnique({
    where: { id: playerId },
  });

  if (!player) throw new Error("Player not found");

  // Apply passive fatigue regen based on time since last update
  const updatedPlayer = await applyFatigueRegenToPlayer(app, player);

  return updatedPlayer;
}
async function getPlayerInfoById(app: FastifyInstance, playerId: string) {
  const player = await app.prisma.player.findUnique({
    where: { id: playerId },
  });

  if (!player) throw new Error("Player not found");

  return {
    name: player.name,
    surname: player.surname,

  };
}
export { getPlayerImage, getPlayerById, getPlayerInfoById };
