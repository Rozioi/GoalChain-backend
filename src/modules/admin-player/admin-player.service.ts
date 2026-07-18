import { FastifyInstance } from "fastify";

export async function updatePlayer(
  app: FastifyInstance,
  playerId: string,
  data: Record<string, any>,
) {
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined),
  );

  const statFields = [
    "overallRating", "pace", "shooting", "passing", "dribbling",
    "defending", "physical", "goalkeeping",
    "paceBonus", "shootingBonus", "passingBonus", "dribblingBonus",
    "defendingBonus", "physicalBonus",
    "potentialMin", "potentialMax",
    "heightCm", "weightKg", "skillMoves", "weakFoot",
    "age", "formValue",
  ];

  const hasStatChanges = statFields.some((f) => f in cleanData);

  if (hasStatChanges) {
    cleanData.imageUrl = null;
  }

  return app.prisma.player.update({
    where: { id: playerId },
    data: cleanData,
  });
}

export async function reissuePlayerCard(
  app: FastifyInstance,
  playerId: string,
): Promise<string> {
  const player = await app.prisma.player.findUnique({
    where: { id: playerId },
  });
  if (!player) throw new Error("Player not found");

  const { assembleCardFromPlayerBuffer } = await import(
    "../player/playerImage.together"
  );

  const cardData = {
    name: player.name,
    surname: player.surname || "",
    nationality: player.nationality,
    club: player.club,
    clubId: player.clubId ?? undefined,
    overallRating: player.overallRating,
    position: player.position,
    pace: player.pace,
    shooting: player.shooting,
    passing: player.passing,
    dribbling: player.dribbling,
    defending: player.defending,
    physical: player.physical,
    face: player.face || undefined,
  };

  const rarity = player.rarity || "bronze";
  const safeName = `${player.name}_${player.surname}`
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_");
  const fileName = `${safeName}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const imageUrl = await assembleCardFromPlayerBuffer(cardData, rarity, fileName);

  await app.prisma.player.update({
    where: { id: playerId },
    data: { imageUrl },
  });

  return imageUrl;
}

export async function searchPlayers(
  app: FastifyInstance,
  query: { search?: string; skip?: number; take?: number },
) {
  const { search, skip = 0, take = 50 } = query;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as any } },
          { surname: { contains: search, mode: "insensitive" as any } },
        ],
      }
    : {};

  const [players, total] = await Promise.all([
    app.prisma.player.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    app.prisma.player.count({ where }),
  ]);

  return { players, total };
}
