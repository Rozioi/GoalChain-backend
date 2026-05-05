import { FastifyInstance } from "fastify";
import { PlayerRole, DraftStep } from "@prisma/client";
export declare function startDraft(app: FastifyInstance, userId: string): Promise<{
    id: string;
    teamId: string | null;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.DraftStatus;
    step: import(".prisma/client").$Enums.DraftStep;
}>;
export declare function getDraftOptions(app: FastifyInstance, userId: string, step: string): Promise<{
    session: {
        options: ({
            player: {
                age: number;
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                surname: string | null;
                overallRating: number;
                position: import(".prisma/client").$Enums.Position;
                role: import(".prisma/client").$Enums.PlayerRole;
                style: import(".prisma/client").$Enums.PlayerStyle;
                pace: number;
                paceBonus: number;
                shooting: number;
                shootingBonus: number;
                passing: number;
                passingBonus: number;
                dribbling: number;
                dribblingBonus: number;
                defending: number;
                defendingBonus: number;
                physical: number;
                physicalBonus: number;
                goalkeeping: number;
                formValue: number;
                fatigue: number;
                country: string;
                potentialMin: number;
                potentialMax: number;
                heightCm: number;
                weightKg: number;
                foot: string;
                skillMoves: number;
                weakFoot: number;
                injuryType: string | null;
                injuryEndsAt: Date | null;
                isNft: boolean;
                mintedAt: Date | null;
                tokenId: string | null;
                nationality: string;
                clubId: number | null;
                club: string;
                leagueId: number | null;
                leagueDivisionId: number | null;
                trainingLevel: number;
                trainingLevelMax: number;
                trainingExperience: number;
                trainingExperienceRequired: number;
                face: string | null;
                hairStyle: string | null;
                hairColor: string | null;
                skinColor: string | null;
                beardStyle: string | null;
                beardColor: string | null;
                emotion: string | null;
                rarity: string | null;
                ownerId: string | null;
            };
        } & {
            id: string;
            playerId: string;
            step: import(".prisma/client").$Enums.DraftStep;
            draftSessionId: string;
            isPicked: boolean;
        })[];
    } & {
        id: string;
        teamId: string | null;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.DraftStatus;
        step: import(".prisma/client").$Enums.DraftStep;
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
