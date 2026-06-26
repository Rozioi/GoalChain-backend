import { FastifyInstance } from "fastify";
export declare function inviteFriend(app: FastifyInstance, senderId: string, friendId: string): Promise<{
    inviteId: string;
    inviteLink: string;
    expiresAt: Date;
    delivery: string;
}>;
export declare function createOpenChallenge(app: FastifyInstance, senderId: string): Promise<{
    inviteId: string;
    inviteLink: string;
    expiresAt: Date;
}>;
export declare function acceptInvite(app: FastifyInstance, userId: string, inviteId: string): Promise<{
    inviteId: string;
    matchId: string;
    match: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        eventId: string | null;
        status: import(".prisma/client").$Enums.MatchStatus;
        type: import(".prisma/client").$Enums.MatchType;
        homeUserId: string | null;
        awayUserId: string | null;
        homeTeamId: string;
        awayTeamId: string | null;
        isBot: boolean;
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
}>;
export declare function declineInvite(app: FastifyInstance, userId: string, inviteId: string): Promise<{
    success: boolean;
}>;
export declare function cancelInvite(app: FastifyInstance, userId: string, inviteId: string): Promise<{
    success: boolean;
}>;
export declare function getPendingInvites(app: FastifyInstance, userId: string): Promise<({
    sender: {
        id: string;
        clubName: string | null;
        points: number;
    };
    recipient: {
        id: string;
        clubName: string | null;
        points: number;
    } | null;
} & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.MatchInviteStatus;
    type: import(".prisma/client").$Enums.MatchInviteType;
    senderId: string;
    recipientId: string | null;
    senderTeamId: string;
    expiresAt: Date;
    acceptedAt: Date | null;
    declinedAt: Date | null;
})[]>;
export declare function expireStaleInvites(app: FastifyInstance): Promise<number>;
export declare function acceptMatchLegacy(app: FastifyInstance, userId: string, matchOrInviteId: string): Promise<{
    inviteId: string;
    matchId: string;
    match: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        eventId: string | null;
        status: import(".prisma/client").$Enums.MatchStatus;
        type: import(".prisma/client").$Enums.MatchType;
        homeUserId: string | null;
        awayUserId: string | null;
        homeTeamId: string;
        awayTeamId: string | null;
        isBot: boolean;
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
} | {
    matchId: string;
    match: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        eventId: string | null;
        status: import(".prisma/client").$Enums.MatchStatus;
        type: import(".prisma/client").$Enums.MatchType;
        homeUserId: string | null;
        awayUserId: string | null;
        homeTeamId: string;
        awayTeamId: string | null;
        isBot: boolean;
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
}>;
