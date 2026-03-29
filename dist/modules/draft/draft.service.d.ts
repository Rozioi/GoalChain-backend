import { FastifyInstance } from "fastify";
import { PlayerRole, DraftStep } from "@prisma/client";
export declare function startDraft(app: FastifyInstance, userId: string): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    status: import(".prisma/client").$Enums.DraftStatus;
    step: import(".prisma/client").$Enums.DraftStep;
    teamId: string | null;
}>;
export declare function getDraftOptions(app: FastifyInstance, userId: string, step: string): Promise<{
    session: {
        options: ({
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
            step: import(".prisma/client").$Enums.DraftStep;
            draftSessionId: string;
            playerId: string;
            isPicked: boolean;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        status: import(".prisma/client").$Enums.DraftStatus;
        step: import(".prisma/client").$Enums.DraftStep;
        teamId: string | null;
    };
    options: any[];
    config: {
        role: PlayerRole;
        count: number;
        picks: number;
        next: DraftStep;
    };
}>;
export declare function pickDraftPlayers(app: FastifyInstance, userId: string, optionIds: string[]): Promise<{
    success: boolean;
    nextStep: import(".prisma/client").$Enums.DraftStep;
    completedStep: boolean;
}>;
export declare function completeDraft(app: FastifyInstance, userId: string): Promise<{
    team: {
        id: string;
        name: string;
        rating: number;
        starters: number;
        reserves: number;
        total: number;
    };
}>;
