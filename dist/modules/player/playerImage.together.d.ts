/**
 * Строит промпт для пиксель-арт портрета игрока.
 */
export declare function buildPlayerImagePrompt(player: {
    name: string;
    surname: string;
    nationality: string;
    club: string;
}): string;
/**
 * Генерирует картинку игрока через Together AI (FLUX),
 * обрабатывает (удаление фона + пикселизация) и сохраняет в public.
 * Возвращает относительный URL для сохранения в БД (player.imageUrl).
 */
export declare function generatePlayerImage(player: {
    name: string;
    surname: string;
    nationality: string;
    club: string;
}, fileNameRaw?: string): Promise<string>;
