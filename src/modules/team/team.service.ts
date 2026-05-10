import { FastifyInstance } from "fastify";
import {
  calculateTeamRating,
  calculateTeamSynergy,
} from "../player/synergy.engine";

export async function getMyTeam(app: FastifyInstance, userId: string) {
  const team = await app.prisma.team.findFirst({
    where: { userId, isEvent: false },
    include: {
      players: {
        include: { player: true },
        orderBy: [{ isStarter: "desc" }, { positionInFormation: "asc" }],
      },
    },
  });

  if (!team) throw new Error("No team found. Complete the draft first.");

  const starters = team.players.filter((tp: any) => tp.isStarter);
  const reserves = team.players.filter((tp: any) => !tp.isStarter);
  const synergy = calculateTeamSynergy(
    starters.map((tp: any) => ({
      position: tp.player.position,
      role: tp.player.role,
      style: tp.player.style,
      overallRating: tp.player.overallRating,
    })),
  );

  return {
    ...team,
    starters,
    reserves,
    synergy,
  };
}

export async function updateLineup(
  app: FastifyInstance,
  userId: string,
  starterIds: string[],
  formation?: string,
) {
  const team = await app.prisma.team.findFirst({
    where: { userId, isEvent: false },
    include: { players: true },
  });

  if (!team) throw new Error("No team found");
  if (starterIds.length !== 11)
    throw new Error("Must have exactly 11 starters");

  const teamPlayerIds = team.players.map((tp: any) => tp.playerId);
  for (const id of starterIds) {
    if (!teamPlayerIds.includes(id)) {
      throw new Error(`Player ${id} is not on your team`);
    }
  }

  await app.prisma.teamPlayer.updateMany({
    where: { teamId: team.id },
    data: { isStarter: false, positionInFormation: null },
  });

  for (let i = 0; i < starterIds.length; i++) {
    const playerId = starterIds[i];
    await app.prisma.teamPlayer.update({
      where: { teamId_playerId: { teamId: team.id, playerId } },
      data: {
        isStarter: true,
        positionInFormation: i.toString(),
      },
    });
  }

  if (formation) {
    await app.prisma.team.update({
      where: { id: team.id },
      data: { formation },
    });
  }

  const starterPlayers = await app.prisma.player.findMany({
    where: { id: { in: starterIds } },
  });
  const rating = calculateTeamRating(
    starterPlayers.map((p: any) => ({
      position: p.position,
      role: p.role,
      style: p.style,
      overallRating: p.overallRating,
    })),
  );

  await app.prisma.team.update({
    where: { id: team.id },
    data: { rating },
  });

  return { success: true, rating };
}

export async function getTeamRating(app: FastifyInstance, userId: string) {
  const team = await app.prisma.team.findFirst({
    where: { userId, isEvent: false },
    include: {
      players: {
        where: { isStarter: true },
        include: { player: true },
      },
    },
  });

  if (!team) throw new Error("No team found");

  const starters = team.players.map((tp: any) => ({
    position: tp.player.position,
    role: tp.player.role,
    style: tp.player.style,
    overallRating: tp.player.overallRating,
  }));

  const rating = calculateTeamRating(starters);
  const synergy = calculateTeamSynergy(starters);

  return { rating, synergy, formation: team.formation };
}
