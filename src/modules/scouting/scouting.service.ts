import { FastifyInstance } from "fastify";
import { PlayerRole } from "@prisma/client";
import { SCOUTING } from "../../config/constants";
import { generatePlayer } from "../player/player.generator";

export async function hireScount(
  app: FastifyInstance,
  userId: string,
  region: string,
  targetRole?: PlayerRole,
  ageMin?: number,
  ageMax?: number,
) {
  if (!SCOUTING.REGIONS.includes(region)) {
    throw new Error(
      `Invalid region. Choose from: ${SCOUTING.REGIONS.join(", ")}`,
    );
  }

  const activeScouts = await app.prisma.scout.count({
    where: { userId, status: "ACTIVE" },
  });

  if (activeScouts >= SCOUTING.MAX_ACTIVE_SCOUTS) {
    throw new Error(
      `Maximum active scouts reached (${SCOUTING.MAX_ACTIVE_SCOUTS})`,
    );
  }

  const user = await app.prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.coins < SCOUTING.COST) {
    throw new Error(
      `Not enough coins. Need ${SCOUTING.COST}, have ${user?.coins || 0}`,
    );
  }

  const endsAt = new Date(Date.now() + SCOUTING.DURATION_MS);

  const [scout] = await app.prisma.$transaction([
    app.prisma.scout.create({
      data: {
        userId,
        region,
        targetRole: targetRole || null,
        ageMin: ageMin || 16,
        ageMax: ageMax || 35,
        endsAt,
      },
    }),
    app.prisma.user.update({
      where: { id: userId },
      data: { coins: { decrement: SCOUTING.COST } },
    }),
  ]);

  // Immediately trigger sync for this user to generate the player
  await syncScoutStates(app, userId);

  return scout;
}

export async function syncScoutStates(app: FastifyInstance, userId: string) {
  const user = await app.prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const scouts = await app.prisma.scout.findMany({
    where: { userId, status: "ACTIVE" },
  });

  const scoutingLevel = user.scoutingLevel || 1;

  for (const scout of scouts) {
    if (new Date() >= scout.endsAt) {
      // Scout completed — generate result
      const isNft = Math.random() < SCOUTING.NFT_CHANCE;

      // Level-based OVR boost
      const levelBoost = (scoutingLevel - 1) * 2;
      const ovrMin = Math.min(95, (isNft ? 70 : 50) + levelBoost);
      const ovrMax = Math.min(99, (isNft ? 90 : 72) + levelBoost);

      const generated = generatePlayer({
        role: (scout.targetRole as PlayerRole) || undefined,
        ovrMin,
        ovrMax,
        seed: `scout-${scout.id}`,
      });

      const player = await app.prisma.player.create({
        data: {
          ...generated,
          isNft,
          age: Math.floor(
            Math.random() * (scout.ageMax - scout.ageMin + 1) + scout.ageMin,
          ),
        },
      });

      await app.prisma.scoutResult.create({
        data: {
          scoutId: scout.id,
          playerId: player.id,
          isNft,
        },
      });

      await app.prisma.scout.update({
        where: { id: scout.id },
        data: { status: "COMPLETED" },
      });
    }
  }
}

export async function getScoutResults(app: FastifyInstance, userId: string) {
  await syncScoutStates(app, userId);

  return app.prisma.scout.findMany({
    where: { userId },
    include: { results: { include: { player: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function collectScoutResult(
  app: FastifyInstance,
  userId: string,
  scoutId: string,
) {
  const scout = await app.prisma.scout.findFirst({
    where: { id: scoutId, userId, status: "COMPLETED" },
    include: { results: { include: { player: true } } },
  });

  if (!scout) throw new Error("Scout not found or not completed");
  if (scout.results.length === 0) throw new Error("No results to collect");

  // Add player to team
  const team = await app.prisma.team.findFirst({
    where: { userId, isEvent: false },
  });

  if (!team) throw new Error("No team found. Complete the draft first.");

  for (const result of scout.results) {
    await app.prisma.teamPlayer.create({
      data: {
        teamId: team.id,
        playerId: result.playerId,
        isStarter: false,
      },
    });
  }

  await app.prisma.scout.update({
    where: { id: scoutId },
    data: { status: "COLLECTED" },
  });

  // Scouting growth: +25 EXP per collect
  const EXP_PER_SCOUT = 25;
  const EXP_FOR_LEVEL = 100;

  const currentUser = await app.prisma.user.findUnique({
    where: { id: userId },
  });
  if (currentUser) {
    let newExp = (currentUser.scoutingExp || 0) + EXP_PER_SCOUT;
    let newLevel = currentUser.scoutingLevel || 1;

    while (newExp >= EXP_FOR_LEVEL) {
      newExp -= EXP_FOR_LEVEL;
      newLevel += 1;
    }

    await app.prisma.user.update({
      where: { id: userId },
      data: {
        scoutingExp: newExp,
        scoutingLevel: newLevel,
      },
    });
  }

  return {
    success: true,
    players: scout.results.map((r: any) => r.player),
  };
}
