import { FastifyInstance } from "fastify";
export declare const nftMintService: {
    prepareMint(app: FastifyInstance, userId: string, playerId: string, walletAddress: string): Promise<{
        validUntil: number;
        messages: {
            address: string;
            amount: string;
            payload: string;
        }[];
        metadata: {
            name: string;
            description: string;
            image: string;
            attributes: ({
                trait_type: string;
                value: number;
            } | {
                trait_type: string;
                value: string;
            })[];
        };
        playerId: string;
    }>;
    confirmMint(app: FastifyInstance, userId: string, playerId: string, walletAddress: string, txHash?: string): Promise<{
        player: {
            age: number;
            name: string;
            id: string;
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
            imageUrl: string | null;
            ownerId: string | null;
            isOnRent: boolean;
            rentPrice: number | null;
        };
        tokenId: string;
    }>;
    getMetadata(app: FastifyInstance, playerId: string): Promise<{
        name: string;
        description: string;
        image: string;
        attributes: ({
            trait_type: string;
            value: number;
        } | {
            trait_type: string;
            value: string;
        })[];
    }>;
};
