import { FastifyInstance } from "fastify";
export declare function getCurrentSeason(app: FastifyInstance): Promise<{
    name: string;
    id: string;
    startDate: Date;
    endDate: Date;
    status: import(".prisma/client").$Enums.SeasonStatus;
    division: number;
    standings: {
        team: {
            user: {
                username: string | null;
                firstName: string | null;
            };
            name: string;
            id: string;
            rating: number;
            userId: string;
        };
        id: string;
        points: number;
        goalsFor: number;
        played: number;
        wins: number;
        draws: number;
        losses: number;
        goalsAgainst: number;
    }[];
} | null>;
export declare function getSeasonStandings(app: FastifyInstance, seasonId: string): Promise<({
    team: {
        user: {
            username: string | null;
            firstName: string | null;
        };
    } & {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rating: number;
        formation: string;
        userId: string;
        isEvent: boolean;
        eventId: string | null;
    };
} & {
    id: string;
    points: number;
    teamId: string;
    seasonId: string;
    goalsFor: number;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsAgainst: number;
})[]>;
export declare function registerForSeason(app: FastifyInstance, userId: string): Promise<{
    season: {
        name: string;
        id: string;
        createdAt: Date;
        startDate: Date;
        endDate: Date;
        status: import(".prisma/client").$Enums.SeasonStatus;
        division: number;
    };
    standing: {
        id: string;
        points: number;
        teamId: string;
        seasonId: string;
        goalsFor: number;
        played: number;
        wins: number;
        draws: number;
        losses: number;
        goalsAgainst: number;
    };
}>;
export declare function updateStandings(app: FastifyInstance, seasonId: string, teamId: string, goalsFor: number, goalsAgainst: number, result: "win" | "draw" | "loss"): Promise<{
    id: string;
    points: number;
    teamId: string;
    seasonId: string;
    goalsFor: number;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsAgainst: number;
}>;
export declare function createSeason(app: FastifyInstance, name: string, division: number): Promise<{
    name: string;
    id: string;
    createdAt: Date;
    startDate: Date;
    endDate: Date;
    status: import(".prisma/client").$Enums.SeasonStatus;
    division: number;
}>;
export declare function checkAndEndExpiredSeasons(app: FastifyInstance): Promise<void>;
export declare function endSeason(app: FastifyInstance, seasonId: string): Promise<{
    name: string;
    id: string;
    createdAt: Date;
    startDate: Date;
    endDate: Date;
    status: import(".prisma/client").$Enums.SeasonStatus;
    division: number;
}>;
export declare function playSeasonMatch(app: FastifyInstance, userId: string): Promise<{
    match: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.MatchStatus;
        eventId: string | null;
        type: import(".prisma/client").$Enums.MatchType;
        seed: string | null;
        homeUserId: string | null;
        awayUserId: string | null;
        homeTeamId: string;
        awayTeamId: string;
        isBot: boolean;
        homeScore: number | null;
        awayScore: number | null;
        overtime: boolean;
        homePressingType: import(".prisma/client").$Enums.PressingType;
        awayPressingType: import(".prisma/client").$Enums.PressingType;
        homeCoins: number;
        awayCoins: number;
        homeExp: number;
        awayExp: number;
        seasonId: string | null;
    };
    result: import("../match/match.simulator").MatchResult;
}>;
