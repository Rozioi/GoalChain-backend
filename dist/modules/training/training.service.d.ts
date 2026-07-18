import { FastifyInstance } from "fastify";
declare class TrainingError extends Error {
    code: string;
    details?: Record<string, any>;
    constructor(message: string, code: string, details?: Record<string, any>);
}
export { TrainingError };
export { TrainingError };
export declare function getRandomComplexes(): Promise<string[]>;
export declare function startTraining(app: FastifyInstance, userId: string, playerId: string, complexId: string): Promise<{
    training: {
        id: string;
        createdAt: Date;
        userId: string;
        status: import(".prisma/client").$Enums.TrainingStatus;
        endsAt: Date;
        cost: number;
        playerId: string;
        stat: string;
        boost: number;
    };
    complexId: string;
    complexLabel: string;
    stats: string[];
    boost: number;
    cost: number;
    newStatValues: {
        [x: string]: number;
    };
}>;
export declare function getTrainingCost(app: FastifyInstance, userId: string, playerId: string): Promise<{
    cost: number;
    totalTrainings: number;
    maxOvr: number;
    currentOverallRating: number;
    currentOvr: number;
    potentialMin: number;
    potentialMax: number;
    isNft: boolean;
    cooldownEndsAt: Date | null;
    lastTrainedStat: string | null;
    lastTrainedStats: string[];
    trainingLevel: number;
    trainingLevelMax: number;
    trainingExperience: number;
    trainingExperienceRequired: number;
}>;
