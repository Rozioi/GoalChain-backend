import type { FastifyInstance } from "fastify";
export interface PlayerCardData {
    name: string;
    surname: string;
    nationality: string;
    club: string;
    clubId?: number;
    overallRating: number;
    position: string;
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
}
export declare function assembleCardFromPlayerBuffer(playerImageBuffer: Buffer, player: PlayerCardData, rarity: string, fileName: string): Promise<string>;
export declare function regeneratePlayerCard(playerId: string, app: FastifyInstance): Promise<string | null>;
