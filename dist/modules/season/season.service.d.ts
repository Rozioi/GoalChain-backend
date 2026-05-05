import { FastifyInstance } from "fastify";
export declare function getCurrentSeason(app: FastifyInstance): Promise<{
    id: string;
    name: string;
    status: import(".prisma/client").$Enums.SeasonStatus;
    division: number;
    startDate: Date;
    endDate: Date;
    standings: {
        team: {
            user: {
                username: string | null;
                firstName: string | null;
            };
            id: string;
            name: string;
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
        id: string;
        name: string;
        rating: number;
        formation: string;
        userId: string;
        isEvent: boolean;
        eventId: string | null;
        createdAt: Date;
        updatedAt: Date;
    };
} & {
    id: string;
    teamId: string;
    points: number;
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
        id: string;
        name: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.SeasonStatus;
        division: number;
        startDate: Date;
        endDate: Date;
    };
    standing: {
        id: string;
        teamId: string;
        points: number;
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
    teamId: string;
    points: number;
    seasonId: string;
    goalsFor: number;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsAgainst: number;
}>;
export declare function createSeason(app: FastifyInstance, name: string, division: number): Promise<{
    id: string;
    name: string;
    createdAt: Date;
    status: import(".prisma/client").$Enums.SeasonStatus;
    division: number;
    startDate: Date;
    endDate: Date;
}>;
export declare function checkAndEndExpiredSeasons(app: FastifyInstance): Promise<void>;
export declare function endSeason(app: FastifyInstance, seasonId: string): Promise<{
    id: string;
    name: string;
    createdAt: Date;
    status: import(".prisma/client").$Enums.SeasonStatus;
    division: number;
    startDate: Date;
    endDate: Date;
}>;
export declare function playSeasonMatch(app: FastifyInstance, userId: string): Promise<{
    match: {
        id: string;
        eventId: string | null;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.MatchType;
        status: import(".prisma/client").$Enums.MatchStatus;
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
