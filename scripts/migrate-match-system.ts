/**
 * Data migration: legacy Match(PENDING) → MatchInvite + Match(READY/COMPLETED)
 *
 * Run AFTER prisma migrate:
 *   npx ts-node scripts/migrate-match-system.ts
 */
import { PrismaClient, MatchStatus, MatchInviteStatus, MatchInviteType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting match system migration...");

  const pendingMatches = await prisma.$queryRaw<
    Array<{
      id: string;
      type: string;
      homeUserId: string | null;
      awayUserId: string | null;
      homeTeamId: string;
      awayTeamId: string | null;
      isBot: boolean;
      createdAt: Date;
    }>
  >`
    SELECT id, type, "homeUserId", "awayUserId", "homeTeamId", "awayTeamId", "isBot", "createdAt"
    FROM "Match"
    WHERE status = 'PENDING'
  `.catch(() => []);

  console.log(`Found ${pendingMatches.length} legacy PENDING matches`);

  for (const m of pendingMatches) {
    const expiresAt = new Date(m.createdAt.getTime() + 24 * 60 * 60 * 1000);
    const isOpen = !m.awayUserId;
    const inviteType: MatchInviteType = isOpen ? "OPEN" : "FRIEND";

    const invite = await prisma.matchInvite.create({
      data: {
        type: inviteType,
        status: expiresAt < new Date() ? "EXPIRED" : "PENDING",
        senderId: m.homeUserId!,
        recipientId: m.awayUserId,
        senderTeamId: m.homeTeamId,
        expiresAt,
      },
    });

    await prisma.match.delete({ where: { id: m.id } });
    console.log(`  Migrated PENDING match ${m.id} → invite ${invite.id}`);
  }

  await prisma.$executeRaw`
    UPDATE "Match"
    SET status = 'COMPLETED'
    WHERE status = 'PENDING'
  `.catch(() => {});

  await prisma.$executeRaw`
    UPDATE "Match"
    SET status = 'READY'
    WHERE status = 'IN_PROGRESS' AND "startedAt" IS NULL
  `.catch(() => {});

  const botSystemUser = await prisma.user.findUnique({
    where: { telegramId: "bot-system" },
  });

  if (botSystemUser) {
    const orphanChallenges = await prisma.match.findMany({
      where: {
        type: "CHALLENGE",
        awayUserId: null,
        homeUserId: { not: botSystemUser.id },
        status: { in: ["READY", "COMPLETED"] as MatchStatus[] },
      },
    });

    for (const m of orphanChallenges) {
      if (m.awayTeamId) {
        const botTeam = await prisma.team.findUnique({
          where: { id: m.awayTeamId },
        });
        if (botTeam?.userId === botSystemUser.id) {
          await prisma.match.update({
            where: { id: m.id },
            data: { awayTeamId: null },
          });
        }
      }
    }
  }

  console.log("Migration complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
