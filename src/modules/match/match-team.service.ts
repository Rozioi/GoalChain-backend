import { FastifyInstance } from "fastify";
import { simulateMatch, PressingType } from "./match.simulator";

export async function getTeamForMatch(app: FastifyInstance, teamId: string) {
  const team = await app.prisma.team.findUnique({
    where: { id: teamId },
    include: {
      players: { include: { player: true } },
    },
  });

  if (!team) throw new Error("Team not found");

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
    rating: team.rating,
    formation: team.formation,
    starters: team.players.filter((tp) => tp.isStarter).map(mapPlayer),
    bench: team.players.filter((tp) => !tp.isStarter).map(mapPlayer),
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
