import { FastifyInstance } from "fastify";
export declare function startTraining(app: FastifyInstance, userId: string, playerId: string, stat: string): Promise<{
    training: {
        id: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.TrainingStatus;
        playerId: string;
        userId: string;
        endsAt: Date;
        cost: number;
        stat: string;
        boost: number;
    };
    stat: string;
    boost: number;
    cost: number;
    newStatValue: number;
}>;
export declare function getTrainingCost(app: FastifyInstance, userId: string, playerId: string): Promise<{
    cost: number;
    totalTrainings: number;
    maxOvr: number;
    currentOverallRating: number;
    isNft: boolean;
    cooldownEndsAt: Date | null;
    lastTrainedStat: string | null;
}>;
