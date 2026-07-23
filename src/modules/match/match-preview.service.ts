import { FastifyInstance } from "fastify";
import {
  calculatePublicRating,
  calculateTeamRating,
  SynergyPlayer,
} from "../player/synergy.engine";

export interface TeamPreviewSide {
  teamId: string;
  name: string;
  ovr: number;
  publicOvr: number;
  clubIcon: string | null;
  points: number;
  attack: number;
  midfield: number;
  defence: number;
  isBot: boolean;
}

function roleStats(starters: SynergyPlayer[]) {
  const avgByRole = (roles: string[], fallback = 70) => {
    const list = starters.filter((p) => roles.includes(p.role));
    if (!list.length) return fallback;
    return Math.round(
      list.reduce((acc, p) => acc + p.overallRating, 0) / list.length,
    );
  };

  return {
    attack: avgByRole(["FORWARD"], 70),
    midfield: avgByRole(["MIDFIELDER"], 70),
    defence: avgByRole(["DEFENDER", "GOALKEEPER"], 70),
  };
}

export async function buildTeamPreview(
  app: FastifyInstance,
  teamId: string,
  isBot = false,
): Promise<TeamPreviewSide | null> {
  const team = await app.prisma.team.findUnique({
    where: { id: teamId },
    include: {
      user: {
        select: {
          clubName: true,
          clubIcon: true,
          points: true,
        },
      },
      players: {
        include: { player: true },
      },
    },
  });

  if (!team) return null;

  const allSynergy: SynergyPlayer[] = team.players.map((tp) => ({
    position: tp.player.position,
    role: tp.player.role,
    style: tp.player.style,
    overallRating: tp.player.overallRating,
  }));

  const starters = team.players
    .filter((tp) => tp.isStarter)
    .map((tp) => ({
      position: tp.player.position,
      role: tp.player.role,
      style: tp.player.style,
      overallRating: tp.player.overallRating,
    }));

  const stats = roleStats(starters.length ? starters : allSynergy.slice(0, 11));

  return {
    teamId: team.id,
    name: team.user?.clubName || team.name,
    ovr: team.rating || calculateTeamRating(starters),
    publicOvr: calculatePublicRating(allSynergy),
    clubIcon: team.user?.clubIcon ?? null,
    points: team.user?.points ?? 0,
    isBot,
    ...stats,
  };
}

export async function buildMatchPreview(
  app: FastifyInstance,
  match: {
    homeTeamId: string;
    awayTeamId: string | null;
    isBot: boolean;
  },
) {
  const home = await buildTeamPreview(app, match.homeTeamId, false);
  const away = match.awayTeamId
    ? await buildTeamPreview(app, match.awayTeamId, match.isBot)
    : null;

  // Если противник — бот, даём ему на 3 points больше, чем у человека
  if (away?.isBot && home) {
    away.points = home.points + 3;
  }

  return { home, away };
}
