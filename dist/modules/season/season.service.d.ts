import { FastifyInstance } from "fastify";
export declare function getCurrentSeason(app: FastifyInstance): Promise<({
    standings: ({
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
    } & {
        id: string;
        teamId: string;
        seasonId: string;
        goalsFor: number;
        points: number;
        played: number;
        wins: number;
        draws: number;
        losses: number;
        goalsAgainst: number;
    })[];
} & {
    id: string;
    createdAt: Date;
    name: string;
    status: import(".prisma/client").$Enums.SeasonStatus;
    division: number;
    startDate: Date;
    endDate: Date;
}) | null>;
export declare function getSeasonStandings(app: FastifyInstance, seasonId: string): Promise<({
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
} & {
    id: string;
    teamId: string;
    seasonId: string;
    goalsFor: number;
    points: number;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsAgainst: number;
})[]>;
export declare function registerForSeason(app: FastifyInstance, userId: string): Promise<{
    season: {
        id: string;
        createdAt: Date;
        name: string;
        status: import(".prisma/client").$Enums.SeasonStatus;
        division: number;
        startDate: Date;
        endDate: Date;
    };
    standing: {
        id: string;
        teamId: string;
        seasonId: string;
        goalsFor: number;
        points: number;
        played: number;
        wins: number;
        draws: number;
        losses: number;
        goalsAgainst: number;
    };
}>;
export declare function updateStandings(app: FastifyInstance, seasonId: string, teamId: string, goalsFor: number, goalsAgainst: number, result: "win" | "draw" | "loss"): Promise<{
    id: string;
    teamId: string;
    seasonId: string;
    goalsFor: number;
    points: number;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsAgainst: number;
}>;
export declare function createSeason(app: FastifyInstance, name: string, division: number): Promise<{
    id: string;
    createdAt: Date;
    name: string;
    status: import(".prisma/client").$Enums.SeasonStatus;
    division: number;
    startDate: Date;
    endDate: Date;
}>;
