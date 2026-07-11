export type MatchOutcome = "win" | "draw" | "loss";
export interface MatchRewardResult {
    points: number;
    coins: number;
    exp: number;
}
export declare function getDivisionLossPenalty(currentPoints: number): number;
export declare function randomWinPoints(): number;
export declare function calculateMatchRewards(outcome: MatchOutcome, currentPoints: number, hasEnergy: boolean, winPoints?: number): MatchRewardResult;
export declare function outcomeForRole(role: "home" | "away", winner: "home" | "away" | "draw"): MatchOutcome;
