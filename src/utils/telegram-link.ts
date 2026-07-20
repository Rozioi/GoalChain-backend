import { env } from "../config/env";

/**
 * Формирует ссылку вида https://t.me/{botUsername}/{appName}?startapp=...
 * Например: https://t.me/goalchainbot/play?startapp=ref_ABC123
 */
export function buildTelegramAppUrl(startapp: string): string {
    const botUsername = env.TELEGRAM_BOT_USERNAME || "goalchainbot";
    const appName = env.TELEGRAM_APP_NAME || "play";
    return `https://t.me/${botUsername}/${appName}?startapp=${encodeURIComponent(startapp)}`;
}
