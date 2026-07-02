import fs from "fs";
import path from "path";

type Locale = Record<string, any>;

const localesDir = path.resolve(__dirname, "locales");
const cache = new Map<string, Locale>();

/** Загружает JSON-файл локали (кешируется) */
function loadLocale(lang: string): Locale {
    if (cache.has(lang)) return cache.get(lang)!;

    try {
        const filePath = path.join(localesDir, `${lang}.json`);
        if (!fs.existsSync(filePath)) return loadLocale("en");
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        cache.set(lang, data);
        return data;
    } catch {
        return loadLocale("en");
    }
}

/**
 * Достаёт вложенное значение по ключу через точку.
 * Пример: get(locale, "start.welcome") → "Добро пожаловать..."
 */
function get(obj: any, key: string): string | undefined {
    return key.split(".").reduce((acc, part) => acc?.[part], obj) as string | undefined;
}

/**
 * Форматирует строку с подстановкой значений.
 * Пример: t("player.rating", { rating: 85 }) → "Рейтинг игрока: 85"
 */
function format(template: string, params?: Record<string, string | number>): string {
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
}

/** Интернационализация для Telegram-бота */
export class I18n {
    private locale: Locale;

    constructor(languageCode?: string) {
        const lang = languageCode?.slice(0, 2) || "en";
        this.locale = loadLocale(lang);
    }

    /**
     * Переводит ключ с опциональной подстановкой параметров.
     *
     * @example
     *   t("start.welcome")
     *   t("player.rating", { rating: 85, name: "John" })
     */
    t(key: string, params?: Record<string, string | number>): string {
        const template = get(this.locale, key);
        if (!template) return get(loadLocale("en"), key) ?? key;
        return format(template, params);
    }
}

/** Создаёт I18n из Telegram-контекста (ctx.from.language_code) */
export function i18nFromCtx(ctx: { from?: { language_code?: string } }): I18n {
    return new I18n(ctx.from?.language_code);
}
