import { MATCH, DIVISION_TIERS } from "../../config/constants";

export type MatchOutcome = "win" | "draw" | "loss";

export interface MatchRewardResult {
  points: number;
  coins: number;
  exp: number;
}

export function getDivisionLossPenalty(currentPoints: number): number {
  const tier = DIVISION_TIERS.find(
    (t) => currentPoints >= t.min && currentPoints <= t.max,
  );
  return tier?.lossPenalty ?? DIVISION_TIERS[0].lossPenalty;
}

export function randomWinPoints(): number {
  return Math.floor(Math.random() * 5) + 26;
}

export function calculateMatchRewards(
  outcome: MatchOutcome,
  currentPoints: number,
  hasEnergy: boolean,
  winPoints?: number,
): MatchRewardResult {
  const exp =
    outcome === "win"
      ? MATCH.REWARDS.WIN_EXP
      : outcome === "draw"
        ? MATCH.REWARDS.DRAW_EXP
        : MATCH.REWARDS.LOSS_EXP;

  let points: number;
  if (outcome === "win") {
    points = winPoints ?? randomWinPoints();
  } else if (outcome === "draw") {
    points = 0;
  } else {
    points = -getDivisionLossPenalty(currentPoints);
  }

  let coins = 0;
  if (hasEnergy) {
    coins =
      outcome === "win"
        ? MATCH.REWARDS.WIN_COINS
        : outcome === "draw"
          ? MATCH.REWARDS.DRAW_COINS
          : MATCH.REWARDS.LOSS_COINS;
  }

  return { points, coins, exp };
}

export function outcomeForRole(
  role: "home" | "away",
  winner: "home" | "away" | "draw",
): MatchOutcome {
  if (winner === "draw") return "draw";
  return winner === role ? "win" : "loss";
}
