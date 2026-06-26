import { FastifyInstance } from "fastify";
export interface EnergyState {
    energy: number;
    maxEnergy: number;
    energyUpdatedAt: Date;
    nextRegenAt: string | null;
}
export declare function buildEnergyState(storedEnergy: number, energyUpdatedAt: Date): EnergyState;
export declare function syncUserEnergy(app: FastifyInstance, userId: string): Promise<EnergyState>;
export declare function assertHasEnergy(app: FastifyInstance, userId: string): Promise<EnergyState>;
export declare function consumeEnergy(app: FastifyInstance, userId: string): Promise<EnergyState>;
export declare function consumeEnergyForUsers(app: FastifyInstance, userIds: string[]): Promise<void>;
