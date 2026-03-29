import { FastifyInstance } from "fastify";
export declare function getMyTeam(app: FastifyInstance, userId: string): Promise<{
    starters: ({
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
        isStarter: boolean;
        teamId: string;
        playerId: string;
        positionInFormation: string | null;
    })[];
    reserves: ({
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
        isStarter: boolean;
        teamId: string;
        playerId: string;
        positionInFormation: string | null;
    })[];
    synergy: import("../player/synergy.engine").SynergyResult;
    players: ({
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
        isStarter: boolean;
        teamId: string;
        playerId: string;
        positionInFormation: string | null;
    })[];
    id: string;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    isEvent: boolean;
    rating: number;
    formation: string;
    userId: string;
    eventId: string | null;
}>;
export declare function updateLineup(app: FastifyInstance, userId: string, starterIds: string[], formation?: string): Promise<{
    success: boolean;
    rating: number;
}>;
export declare function getTeamRating(app: FastifyInstance, userId: string): Promise<{
    rating: number;
    synergy: import("../player/synergy.engine").SynergyResult;
    formation: string;
}>;
