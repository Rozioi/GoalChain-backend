import { FastifyInstance } from "fastify";
import { PlayerRole } from "@prisma/client";
export declare function hireScount(app: FastifyInstance, userId: string, region: string, targetRole?: PlayerRole, ageMin?: number, ageMax?: number): Promise<{
    id: string;
    createdAt: Date;
    userId: string;
    status: import(".prisma/client").$Enums.ScoutStatus;
    endsAt: Date;
    region: string;
    ageMin: number;
    ageMax: number;
    targetRole: import(".prisma/client").$Enums.PlayerRole | null;
}>;
export declare function getScoutResults(app: FastifyInstance, userId: string): Promise<({
    results: ({
        player: {
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
        };
    } & {
        id: string;
        createdAt: Date;
        playerId: string;
        isNft: boolean;
        scoutId: string;
    })[];
} & {
    id: string;
    createdAt: Date;
    userId: string;
    status: import(".prisma/client").$Enums.ScoutStatus;
    endsAt: Date;
    region: string;
    ageMin: number;
    ageMax: number;
    targetRole: import(".prisma/client").$Enums.PlayerRole | null;
})[]>;
export declare function collectScoutResult(app: FastifyInstance, userId: string, scoutId: string): Promise<{
    success: boolean;
    players: any[];
}>;
