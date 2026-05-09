import { FastifyInstance } from "fastify";
export declare function getGlobalStats(app: FastifyInstance): Promise<{
    users: number;
    teams: number;
    matches: number;
    economy: number;
    timestamp: string;
}>;
export declare function listUsers(app: FastifyInstance, query: {
    search?: string;
    skip?: number;
    take?: number;
}): Promise<{
    users: {
        level: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        telegramId: string;
        referralCode: string;
        username: string | null;
        firstName: string | null;
        lastName: string | null;
        photoUrl: string | null;
        coins: number;
        reputation: number;
        points: number;
        experience: number;
        isAdmin: boolean;
        scoutingLevel: number;
        scoutingExp: number;
        referredById: string | null;
        dailyMatchesPlayed: number;
        dailyMatchesResetAt: Date;
    }[];
    total: number;
}>;
export declare function updateUser(app: FastifyInstance, userId: string, data: {
    coins?: number;
    points?: number;
    level?: number;
    username?: string;
    isAdmin?: boolean;
}): Promise<{
    level: number;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    telegramId: string;
    referralCode: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    photoUrl: string | null;
    coins: number;
    reputation: number;
    points: number;
    experience: number;
    isAdmin: boolean;
    scoutingLevel: number;
    scoutingExp: number;
    referredById: string | null;
    dailyMatchesPlayed: number;
    dailyMatchesResetAt: Date;
}>;
export declare function createSeason(app: FastifyInstance, data: {
    name: string;
    startDate: Date;
    endDate: Date;
    division: number;
}): Promise<{
    name: string;
    id: string;
    createdAt: Date;
    startDate: Date;
    endDate: Date;
    status: import(".prisma/client").$Enums.SeasonStatus;
    division: number;
}>;
export declare function updateSeasonStatus(app: FastifyInstance, seasonId: string, status: "UPCOMING" | "ACTIVE" | "PLAYOFFS" | "COMPLETED"): Promise<{
    name: string;
    id: string;
    createdAt: Date;
    startDate: Date;
    endDate: Date;
    status: import(".prisma/client").$Enums.SeasonStatus;
    division: number;
}>;
export declare function listSeasons(app: FastifyInstance): Promise<{
    name: string;
    id: string;
    createdAt: Date;
    startDate: Date;
    endDate: Date;
    status: import(".prisma/client").$Enums.SeasonStatus;
    division: number;
}[]>;
export declare function endSeason(app: FastifyInstance, seasonId: string): Promise<{
    name: string;
    id: string;
    createdAt: Date;
    startDate: Date;
    endDate: Date;
    status: import(".prisma/client").$Enums.SeasonStatus;
    division: number;
}>;
