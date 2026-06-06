export interface PlayerStats {
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
}
export type PressingType = "SOFT" | "MEDIUM" | "INTENSIVE";
export interface Substitution {
    minute: number;
    team: "home" | "away";
    outId: string;
    inId: string;
}
export interface PressingChange {
    minute: number;
    team: "home" | "away";
    type: PressingType;
}
export interface TeamInput {
    rating: number;
    formation: string;
    starters: PlayerStats[];
    bench: PlayerStats[];
    pressingType: PressingType;
}
export interface MatchEvent {
    minute: number;
    type: "goal" | "save" | "chance" | "foul" | "injury" | "redCard" | "yellowCard" | "substitution";
    team: "home" | "away";
    playerId?: string;
    playerName?: string;
    playerOutId?: string;
    playerOutName?: string;
    description: string;
}
export interface MatchResult {
    homeScore: number;
    awayScore: number;
    winner: "home" | "away" | "draw";
    seed: string;
    events: MatchEvent[];
    homeStats: {
        possession: number;
        shots: number;
        shotsOnTarget: number;
    };
    awayStats: {
        possession: number;
        shots: number;
        shotsOnTarget: number;
    };
    overtime: boolean;
}
export declare function simulateMatch(home: TeamInput, away: TeamInput, seed: string, options?: {
    forceOvertime?: boolean;
    manualSubstitutions?: Substitution[];
    pressingChanges?: PressingChange[];
    lockedEvents?: MatchEvent[];
    skipUntilMinute?: number;
}): MatchResult;
export declare function calculateRiskRating(pressing: PressingType, activePlayers: PlayerStats[], yellowCards: Record<string, number>): number;
