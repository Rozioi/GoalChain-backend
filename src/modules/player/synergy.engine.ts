import { PlayerStyle, PlayerRole } from "@prisma/client";

export interface SynergyPlayer {
  position: string;
  role: PlayerRole;
  style: PlayerStyle;
  overallRating: number;
}

export interface SynergyResult {
  totalBonus: number;
  details: string[];
}

const STYLE_SYNERGY: Partial<
  Record<PlayerStyle, Partial<Record<PlayerStyle, number>>>
> = {
  SPEEDY: { TECHNICAL: 3, ATTACKING: 2 },
  POWERFUL: { DEFENSIVE: 3, POSITIONAL: 2 },
  TECHNICAL: { SPEEDY: 3, ATTACKING: 2, POSITIONAL: 1 },
  ATTACKING: { SPEEDY: 2, TECHNICAL: 2 },
  DEFENSIVE: { POWERFUL: 3, POSITIONAL: 2 },
  POSITIONAL: { DEFENSIVE: 2, TECHNICAL: 1, POWERFUL: 2 },
};

const ROLE_SYNERGY: Record<string, number> = {
  "DEFENDER-MIDFIELDER": 2,
  "MIDFIELDER-FORWARD": 2,
  "DEFENDER-FORWARD": 1,
};

const POSITION_SYNERGY: Record<string, number> = {
  "CB-CDM": 4,
  "CDM-CM": 3,
  "CM-CAM": 3,
  "CAM-ST": 4,
  "LW-ST": 3,
  "RW-ST": 3,
  "LW-CAM": 2,
  "RW-CAM": 2,
};

function getPairKey(a: string, b: string): string {
  const sorted = [a, b].sort();
  return `${sorted[0]}-${sorted[1]}`;
}

export function calculateTeamSynergy(players: SynergyPlayer[]): SynergyResult {
  const details: string[] = [];
  let totalBonus = 0;

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const p1 = players[i];
      const p2 = players[j];

      const styleBonus = STYLE_SYNERGY[p1.style]?.[p2.style] ?? 0;
      if (styleBonus > 0) {
        totalBonus += styleBonus;
        details.push(`${p1.style} + ${p2.style}: +${styleBonus} synergy`);
      }

      const roleKey = getPairKey(p1.role, p2.role);
      const roleBonus = ROLE_SYNERGY[roleKey] ?? 0;
      if (roleBonus > 0) {
        totalBonus += roleBonus;
      }

      const posKey = getPairKey(p1.position, p2.position);
      const posBonus = POSITION_SYNERGY[posKey] ?? 0;
      if (posBonus > 0) {
        totalBonus += posBonus;
        details.push(
          `${p1.position} + ${p2.position}: +${posBonus} tactical synergy`,
        );
      }
    }
  }

  const roleCounts: Record<string, number> = {};
  for (const p of players) {
    roleCounts[p.role] = (roleCounts[p.role] || 0) + 1;
  }

  const hasGK = (roleCounts["GOALKEEPER"] ?? 0) >= 1;
  const hasDEF = (roleCounts["DEFENDER"] ?? 0) >= 3;
  const hasMID = (roleCounts["MIDFIELDER"] ?? 0) >= 3;
  const hasFWD = (roleCounts["FORWARD"] ?? 0) >= 1;

  if (hasGK && hasDEF && hasMID && hasFWD) {
    totalBonus += 5;
    details.push("Balanced formation: +5 synergy");
  }

  const uniqueStyles = new Set(players.map((p) => p.style));
  if (uniqueStyles.size >= 4) {
    totalBonus += 3;
    details.push("Style diversity: +3 synergy");
  }

  return { totalBonus, details };
}

export function calculateTeamRating(players: SynergyPlayer[]): number {
  if (players.length === 0) return 0;

  const avgOvr =
    players.reduce((sum, p) => sum + p.overallRating, 0) / players.length;

  const synergy = calculateTeamSynergy(players);
  return Math.round((avgOvr + synergy.totalBonus) * 10) / 10;
}

/** Средний OVR всего состава (старт + скамейка), без синергии */
export function calculatePublicRating(players: SynergyPlayer[]): number {
  if (players.length === 0) return 0;
  const avgOvr =
    players.reduce((sum, p) => sum + p.overallRating, 0) / players.length;
  return Math.round(avgOvr * 10) / 10;
}
