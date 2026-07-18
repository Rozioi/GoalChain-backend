// Фикс существующих игроков: обрезает все статы до 99
// Запуск: npx tsx scripts/fix-over-99-players.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STAT_FIELDS = [
  "overallRating", "pace", "shooting", "passing", "dribbling",
  "defending", "physical", "goalkeeping",
  "potentialMin", "potentialMax",
];

async function main() {
  const players = await prisma.player.findMany({
    where: {
      OR: STAT_FIELDS.map((field) => ({ [field]: { gt: 99 } })),
    },
  });

  console.log(`Found ${players.length} players with stats > 99`);

  for (const player of players) {
    const updateData: Record<string, number> = {};
    for (const field of STAT_FIELDS) {
      const val = (player as any)[field] as number;
      if (val > 99) {
        updateData[field] = 99;
      } else if (val < 1 && field !== "goalkeeping") {
        updateData[field] = 1;
      }
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.player.update({
        where: { id: player.id },
        data: updateData,
      });
      console.log(`Fixed ${player.name} ${player.surname}: ${Object.keys(updateData).join(", ")}`);
    }
  }

  console.log("Done!");
  await prisma.$disconnect();
}

main().catch(console.error);
