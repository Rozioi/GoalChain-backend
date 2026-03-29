import { FastifyInstance } from "fastify";
export declare function registerUser(app: FastifyInstance, telegramId: string, username?: string, firstName?: string, lastName?: string): Promise<{
    user: {
        id: string;
        telegramId: string;
        referralCode: string;
        username: string | null;
        firstName: string | null;
        lastName: string | null;
        coins: number;
        reputation: number;
        referredById: string | null;
        dailyMatchesPlayed: number;
        dailyMatchesResetAt: Date;
        createdAt: Date;
        updatedAt: Date;
    };
    token: string;
    isNew: boolean;
}>;
export declare function getUserProfile(app: FastifyInstance, userId: string): Promise<({
    teams: ({
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
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isEvent: boolean;
        rating: number;
        formation: string;
        userId: string;
        eventId: string | null;
    })[];
    _count: {
        referralsMade: number;
    };
} & {
    id: string;
    telegramId: string;
    referralCode: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    coins: number;
    reputation: number;
    referredById: string | null;
    dailyMatchesPlayed: number;
    dailyMatchesResetAt: Date;
    createdAt: Date;
    updatedAt: Date;
}) | null>;
export declare function applyReferralCode(app: FastifyInstance, userId: string, code: string): Promise<{
    success: boolean;
    bonus: number;
}>;
export declare function getUserReferrals(app: FastifyInstance, userId: string): Promise<({
    invitee: {
        id: string;
        telegramId: string;
        username: string | null;
        firstName: string | null;
        lastName: string | null;
        createdAt: Date;
    };
} & {
    id: string;
    createdAt: Date;
    inviterId: string;
    inviteeId: string;
    reward: number;
})[]>;
