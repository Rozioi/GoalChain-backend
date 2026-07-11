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
export declare function buildPlayerImagePrompt(player: {
    name: string;
    surname: string;
    nationality: string;
    club: string;
}): string;
/**
 * Мгновенно собирает карточку на основе локального файла assets/player.png.
 * Рекомендуется использовать PNG с прозрачным фоном.
 */
export declare function generatePlayerImageMock(player: PlayerCardData, rarity?: string, fileNameRaw?: string): Promise<string>;
export declare function regeneratePlayerCard(playerId: string, app: FastifyInstance): Promise<string | null>;
export declare function generatePlayerImage(player: PlayerCardData, rarity?: string, fileNameRaw?: string): Promise<string>;
