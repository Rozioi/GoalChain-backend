import { FastifyInstance } from "fastify";

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

  return player;
}
export { getPlayerImage, getPlayerById };
