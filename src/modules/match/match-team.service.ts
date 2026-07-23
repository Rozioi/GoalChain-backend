import { FastifyInstance } from "fastify";
import { simulateMatch, PressingType } from "./match.simulator";
import { applyFatigueRegenToTeam } from "./fatigue.system";

export async function getTeamForMatch(app: FastifyInstance, teamId: string) {
  const team = await app.prisma.team.findUnique({
    where: { id: teamId },
    include: {
      players: { include: { player: true } },
    },
  });

  if (!team) throw new Error("Team not found");

  // Apply passive fatigue regen before loading — each hour of rest = -10 fatigue
  await applyFatigueRegenToTeam(
    app,
    team.players.map((tp) => tp.player),
  );

  // Re-fetch players after regen updates to get fresh fatigue values
  const refreshedTeam = await app.prisma.team.findUnique({
    where: { id: teamId },
    include: {
      players: { include: { player: true } },
    },
  });
  if (!refreshedTeam) throw new Error("Team not found");

  const mapPlayer = (tp: {
    player: {
      id: string;
      name: string;
      overallRating: number;
      pace: number;
      shooting: number;
      passing: number;
      dribbling: number;
      defending: number;
      physical: number;
      goalkeeping: number;
      formValue: number;
      fatigue: number;
      position: string;
      role: string;
      style: string;
      updatedAt: Date;
    };
  }) => ({
    id: tp.player.id,
    name: tp.player.name,
    overallRating: tp.player.overallRating,
    pace: tp.player.pace,
    shooting: tp.player.shooting,
    passing: tp.player.passing,
    dribbling: tp.player.dribbling,
    defending: tp.player.defending,
    physical: tp.player.physical,
    goalkeeping: tp.player.goalkeeping,
    formValue: tp.player.formValue,
    fatigue: tp.player.fatigue,
    position: tp.player.position,
    role: tp.player.role,
    style: tp.player.style,
  });

  return {
    rating: refreshedTeam.rating,
    formation: refreshedTeam.formation,
    starters: refreshedTeam.players.filter((tp) => tp.isStarter).map(mapPlayer),
    bench: refreshedTeam.players.filter((tp) => !tp.isStarter).map(mapPlayer),
    pressingType: "MEDIUM" as PressingType,
  };
}

export async function loadTeamsForMatch(
  app: FastifyInstance,
  homeTeamId: string,
  awayTeamId: string,
  homePressing: PressingType = "MEDIUM",
  awayPressing: PressingType = "MEDIUM",
) {
  const homeTeamData = await getTeamForMatch(app, homeTeamId);
  const awayTeamData = await getTeamForMatch(app, awayTeamId);
  homeTeamData.pressingType = homePressing;
  awayTeamData.pressingType = awayPressing;
  return { homeTeamData, awayTeamData };
}

export { simulateMatch };
