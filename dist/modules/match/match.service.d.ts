import { FastifyInstance } from "fastify";
export declare function playFriendlyMatch(app: FastifyInstance, userId: string): Promise<{
    match: {
        homeTeam: {
            name: string;
        };
        awayTeam: {
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        eventId: string | null;
        status: import(".prisma/client").$Enums.MatchStatus;
        seed: string | null;
        type: import(".prisma/client").$Enums.MatchType;
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
    result: import("./match.simulator").MatchResult;
    rewards: {
        coins: number;
        exp: number;
    };
    isBot: boolean;
} | {
    match: {
        homeTeam: {
            name: string;
        };
        awayTeam: {
            name: string;
        };
        events: {
            description: string;
            team: string;
            id: string;
            createdAt: Date;
            playerId: string | null;
            type: string;
            minute: number;
            playerName: string | null;
            matchId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        eventId: string | null;
        status: import(".prisma/client").$Enums.MatchStatus;
        seed: string | null;
        type: import(".prisma/client").$Enums.MatchType;
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
    result: {
        homeScore: number;
        awayScore: number;
        winner: string;
        events: {
            minute: number;
            type: string;
            team: string;
            playerId: string | null;
            playerName: string | null;
            description: string;
        }[];
        overtime: boolean;
    };
    rewards: {
        coins: number;
        exp: number;
    };
    isBot: boolean;
}>;
export declare function playBotMatch(app: FastifyInstance, userId: string): Promise<{
    match: {
        homeTeam: {
            name: string;
        };
        awayTeam: {
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        eventId: string | null;
        status: import(".prisma/client").$Enums.MatchStatus;
        seed: string | null;
        type: import(".prisma/client").$Enums.MatchType;
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
    result: import("./match.simulator").MatchResult;
    rewards: {
        coins: number;
        exp: number;
    };
    isBot: boolean;
}>;
export declare function updateMatchTactics(app: FastifyInstance, matchId: string, userId: string, tactics: {
    pressingType?: "SOFT" | "MEDIUM" | "INTENSIVE";
    substitution?: {
        outId: string;
        inId: string;
    };
}): Promise<{
    result: import("./match.simulator").MatchResult;
}>;
export declare function inviteFriend(app: FastifyInstance, userId: string, friendTelegramId: string): Promise<{
    matchId: string;
    inviteLink: string;
}>;
export declare function acceptMatch(app: FastifyInstance, userId: string, matchId: string): Promise<{
    match: {
        homeScore: number;
        awayScore: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        eventId: string | null;
        status: import(".prisma/client").$Enums.MatchStatus;
        seed: string | null;
        type: import(".prisma/client").$Enums.MatchType;
        homeUserId: string | null;
        awayUserId: string | null;
        homeTeamId: string;
        awayTeamId: string;
        isBot: boolean;
        overtime: boolean;
        homePressingType: import(".prisma/client").$Enums.PressingType;
        awayPressingType: import(".prisma/client").$Enums.PressingType;
        homeCoins: number;
        awayCoins: number;
        homeExp: number;
        awayExp: number;
        seasonId: string | null;
    };
    result: import("./match.simulator").MatchResult;
}>;
export declare function getMatchHistory(app: FastifyInstance, userId: string, limit?: number): Promise<({
    homeTeam: {
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
    awayTeam: {
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
    events: {
        description: string;
        team: string;
        id: string;
        createdAt: Date;
        playerId: string | null;
        type: string;
        minute: number;
        playerName: string | null;
        matchId: string;
    }[];
} & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    eventId: string | null;
    status: import(".prisma/client").$Enums.MatchStatus;
    seed: string | null;
    type: import(".prisma/client").$Enums.MatchType;
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
})[]>;
