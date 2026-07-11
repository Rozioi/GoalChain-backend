import { FastifyInstance } from "fastify";
export declare function generateBotTeam(app: FastifyInstance, targetRating: number): Promise<{
    team: {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rating: number;
        formation: string;
        userId: string;
        isEvent: boolean;
        isBot: boolean;
        eventId: string | null;
    };
    starters: {
        id: string;
    }[];
}>;
