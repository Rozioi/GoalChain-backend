import { FastifyInstance } from "fastify";

export async function updateTeam(
  app: FastifyInstance,
  teamId: string,
  data: { name?: string; formation?: string; rating?: number },
) {
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined),
  );

  return app.prisma.team.update({
    where: { id: teamId },
    data: cleanData,
    include: {
      players: {
        include: { player: true },
      },
    },
  });
}

export async function addPlayerToTeam(
  app: FastifyInstance,
  teamId: string,
  playerId: string,
  isStarter?: boolean,
  positionInFormation?: string,
) {
  const existing = await app.prisma.teamPlayer.findFirst({
    where: { playerId },
  });
  if (existing) {
    throw new Error("Player already belongs to a team");
  }

  // Получаем команду, чтобы узнать владельца
  const team = await app.prisma.team.findUnique({
    where: { id: teamId },
    select: { userId: true },
  });
  if (!team) throw new Error("Team not found");

  // Назначаем владельца игроку
  await app.prisma.player.update({
    where: { id: playerId },
    data: { ownerId: team.userId },
  });

  return app.prisma.teamPlayer.create({
    data: {
      teamId,
      playerId,
      isStarter: isStarter ?? false,
      positionInFormation: positionInFormation ?? null,
    },
    include: { player: true },
  });
}

export async function removePlayerFromTeam(
  app: FastifyInstance,
  teamId: string,
  playerId: string,
) {
  await app.prisma.teamPlayer.delete({
    where: {
      teamId_playerId: { teamId, playerId },
    },
  });
  return { success: true };
}

export async function getTeam(
  app: FastifyInstance,
  teamId: string,
) {
  const team = await app.prisma.team.findUnique({
    where: { id: teamId },
    include: {
      players: {
        include: { player: true },
        orderBy: { isStarter: "desc" },
      },
      user: {
        select: { id: true, username: true, clubName: true },
      },
    },
  });
  if (!team) throw new Error("Team not found");
  return team;
}

export async function searchTeams(
  app: FastifyInstance,
  query: { search?: string; skip?: number; take?: number },
) {
  const { search, skip = 0, take = 50 } = query;

  const where = search
    ? { name: { contains: search, mode: "insensitive" as any } }
    : {};

  const [teams, total] = await Promise.all([
    app.prisma.team.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { players: true } },
        user: { select: { username: true, clubName: true } },
      },
    }),
    app.prisma.team.count({ where }),
  ]);

  return { teams, total };
}
