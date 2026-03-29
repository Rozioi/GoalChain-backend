import { FastifyInstance } from "fastify";
/**
 * Generates a bot team with stats close to the target rating.
 */
export declare function generateBotTeam(app: FastifyInstance, targetRating: number): Promise<{
    team: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isEvent: boolean;
        rating: number;
        formation: string;
        userId: string;
        eventId: string | null;
    };
    starters: {
        age: number;
        id: string;
        createdAt: Date;
        name: string;
        pace: number;
        shooting: number;
        passing: number;
        dribbling: number;
        defending: number;
        physical: number;
        goalkeeping: number;
        ovr: number;
        position: import(".prisma/client").$Enums.Position;
        role: import(".prisma/client").$Enums.PlayerRole;
        style: import(".prisma/client").$Enums.PlayerStyle;
        potential: number;
        form: number;
        nationality: string;
        club: string;
        fatigue: number;
        synergyBonus: number;
        isNft: boolean;
    }[];
}>;
