import { FastifyInstance } from "fastify";
export declare function getCurrentSeason(app: FastifyInstance): Promise<{
    name: string;
    id: string;
    status: import(".prisma/client").$Enums.SeasonStatus;
    startDate: Date;
    endDate: Date;
    division: number;
    standings: {
        id: string;
        points: number;
        team: {
            name: string;
            user: {
                username: string | null;
                clubName: string | null;
            };
            id: string;
            rating: number;
            userId: string;
        };
        played: number;
        wins: number;
        draws: number;
        losses: number;
        goalsFor: number;
        goalsAgainst: number;
    }[];
} | null>;
export declare function getSeasonStandings(app: FastifyInstance, seasonId: string, userId?: string, filter?: "GLOBAL" | "FRIENDS"): Promise<({
    team: {
        user: {
            username: string | null;
            firstName: string | null;
            clubName: string | null;
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
        isBot: boolean;
        eventId: string | null;
    };
} & {
    id: string;
    points: number;
    seasonId: string;
    teamId: string;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
})[]>;
export declare function registerForSeason(app: FastifyInstance, userId: string): Promise<{
    season: {
        name: string;
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.SeasonStatus;
        startDate: Date;
        endDate: Date;
        division: number;
    };
    standing: {
        id: string;
        points: number;
        seasonId: string;
        teamId: string;
        played: number;
        wins: number;
        draws: number;
        losses: number;
        goalsFor: number;
        goalsAgainst: number;
    };
}>;
export declare function updateStandings(app: FastifyInstance, seasonId: string, teamId: string, goalsFor: number, goalsAgainst: number, result: "win" | "draw" | "loss"): Promise<{
    id: string;
    points: number;
    seasonId: string;
    teamId: string;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
}>;
export declare function createSeason(app: FastifyInstance, name: string, division: number): Promise<{
    name: string;
    id: string;
    createdAt: Date;
    status: import(".prisma/client").$Enums.SeasonStatus;
    startDate: Date;
    endDate: Date;
    division: number;
}>;
/**
 * Automatically start seasons whose startDate has passed and are still UPCOMING
 */
export declare function checkAndStartUpcomingSeasons(app: FastifyInstance): Promise<void>;
export declare function checkAndEndExpiredSeasons(app: FastifyInstance): Promise<void>;
export declare function endSeason(app: FastifyInstance, seasonId: string): Promise<{
    name: string;
    id: string;
    createdAt: Date;
    status: import(".prisma/client").$Enums.SeasonStatus;
    startDate: Date;
    endDate: Date;
    division: number;
}>;
export declare function playSeasonMatch(app: FastifyInstance, userId: string): Promise<{
    match: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isBot: boolean;
        eventId: string | null;
        status: import(".prisma/client").$Enums.MatchStatus;
        type: import(".prisma/client").$Enums.MatchType;
        homeUserId: string | null;
        awayUserId: string | null;
        homeTeamId: string;
        awayTeamId: string | null;
        homeScore: number | null;
        awayScore: number | null;
        seed: string | null;
        overtime: boolean;
        homePressingType: import(".prisma/client").$Enums.PressingType;
        awayPressingType: import(".prisma/client").$Enums.PressingType;
        homeCoins: number;
        awayCoins: number;
        homeExp: number;
        awayExp: number;
        currentMinute: number;
        startedAt: Date | null;
        finishedAt: Date | null;
        homeReady: boolean;
        awayReady: boolean;
        inviteId: string | null;
        seasonId: string | null;
    };
    matchId: string;
    status: "IN_PROGRESS";
    isBot: boolean;
    preloaderData: {
        homePlayer: {
            id: string;
            name: string;
            points: number;
        };
        awayPlayer: {
            id: string;
            name: string;
            points: number;
        };
    };
}>;
