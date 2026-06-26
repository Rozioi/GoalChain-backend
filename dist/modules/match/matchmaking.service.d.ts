import { FastifyInstance } from "fastify";
export declare function startMatchmaking(app: FastifyInstance, userId: string): Promise<{
    queueId: string;
    status: string;
    matchId?: undefined;
    isBot?: undefined;
} | {
    matchId: string;
    status: string;
    isBot: boolean;
    queueId?: undefined;
}>;
export declare function cancelMatchmaking(app: FastifyInstance, userId: string): Promise<{
    success: boolean;
    message: string;
} | {
    success: boolean;
    message?: undefined;
}>;
export declare function expireStaleMatchmaking(app: FastifyInstance): Promise<number>;
export declare function onMatchmakingMatched(app: FastifyInstance, homeUserId: string, awayUserId: string, matchId: string): Promise<void>;
