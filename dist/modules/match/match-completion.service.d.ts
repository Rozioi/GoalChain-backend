import { FastifyInstance } from "fastify";
interface MatchResult {
    homeScore: number;
    awayScore: number;
    winner: "home" | "away" | "draw";
    events: Array<{
        minute: number;
        type: string;
        team: string;
        playerId?: string;
        playerName?: string;
        playerOutId?: string;
        playerOutName?: string;
        description: string;
    }>;
}
export declare function handleMatchCompletion(app: FastifyInstance, match: {
    id: string;
    homeUserId?: string | null;
    awayUserId?: string | null;
    homeTeamId: string;
    awayTeamId?: string | null;
    isBot?: boolean;
}, result: MatchResult, seed: string): Promise<{
    homeCoins: number;
    awayCoins: number;
    homeExp: number;
    awayExp: number;
}>;
export declare function formatMatchEvents(events: Array<{
    type: string;
    minute: number;
    team: string;
    playerId: string | null;
    playerName: string | null;
    playerOutId?: string | null;
    playerOutName?: string | null;
    description: string;
}>): {
    minute: number;
    type: string;
    team: string;
    playerId: string | null;
    playerName: string | null;
    playerOutId: string | null | undefined;
    playerOutName: string | null | undefined;
    description: string;
}[];
export {};
