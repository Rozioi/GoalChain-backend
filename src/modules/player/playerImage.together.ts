import fs from "fs";
import path from "path";
import sharp from "sharp";
import OpenAI from "openai";
import { Resvg } from "@resvg/resvg-js";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || undefined,
});

const PUBLIC_DIR = "./public/generated-players/";

/** Входные данные для генерации карточки */
export interface PlayerCardData {
    name: string;
    surname: string;
    nationality: string;
    club: string;
    overallRating: number;
    position: string;
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
}

// --- Параметры карточки ---
const CARD_WIDTH = 853;
const CARD_HEIGHT = 1280;

const FONT_PATH = path.resolve("./assets/hud.otf");
const FONT_FAMILY = "Hud";
const CARD_TEMPLATE = path.resolve("./assets/background.jpg");

/** Рендерим SVG → PNG через Resvg */
function renderSvg(svg: string): Buffer {
    const hasFont = fs.existsSync(FONT_PATH);
    const resvg = new Resvg(svg, {
        font: {
            fontFiles: hasFont ? [FONT_PATH] : [],
            loadSystemFonts: !hasFont,
            defaultFontFamily: FONT_FAMILY,
        },
    });
    return resvg.render().asPng();
}

/** Генерируем SVG-текст: рейтинг, позиция, имя, статы */
function buildTextOverlay(player: PlayerCardData): string {
    const nameDisplay = (player.surname || player.name).toUpperCase();
    return `
    <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .pixel-text { fill: #1a1a1a; font-family: '${FONT_FAMILY}'; font-weight: bold; }
        .rating   { font-size: 86px; }
        .position { font-size: 86px; }
        .name     { font-size: 64px; text-anchor: middle; }
        .stat     { font-size: 42px; }
      </style>
      <text x="140" y="287" class="pixel-text rating">${player.overallRating}</text>
      <text x="140" y="417" textLength="140" lengthAdjust="spacingAndGlyphs" class="pixel-text position">${player.position}</text>
      <text x="443" y="830" class="pixel-text name">${nameDisplay}</text>
      <text x="160" y="892"  class="pixel-text stat">${player.pace} PAC</text>
      <text x="164" y="980"  class="pixel-text stat">${player.shooting} SHO</text>
      <text x="164" y="1070" class="pixel-text stat">${player.passing} PAS</text>
      <text x="490" y="892"  class="pixel-text stat">${player.dribbling} DRI</text>
      <text x="490" y="980"  class="pixel-text stat">${player.defending} DEF</text>
      <text x="490" y="1070" class="pixel-text stat">${player.physical} PHY</text>
    </svg>`.trim();
}

export function buildPlayerImagePrompt(player: {
    name: string;
    surname: string;
    nationality: string;
    club: string;
}): string {
    return `Pixel art 16-bit SNES style frontal portrait, head and torso view of a male football player.
The player has appearance of ${player.nationality} nationality.
Wearing ${player.club} football kit.
Solid white background. Looking directly at camera.
No logos, no watermarks, clean pixel art.`
        .replace(/\n\s+/g, "\n")
        .trim();
}

/**
 * Генерирует карточку игрока (853×1280) через OpenAI DALL-E 3:
 *  - фон карточки (assets/background.jpg)
 *  - пиксельный портрет игрока
 *  - рейтинг, позиция, имя, статы
 *  - цветная рамка по редкости
 *
 *  Если нет ключа API или шаблона — возвращает "".
 */
export async function generatePlayerImage(
    player: PlayerCardData,
    rarity: string = "bronze",
    fileNameRaw?: string,
): Promise<string> {
    if (!process.env.OPENAI_API_KEY) {
        console.log("[OpenAI] API key not set, skipping image generation");
        return "";
    }

    if (!fs.existsSync(PUBLIC_DIR))
        fs.mkdirSync(PUBLIC_DIR, { recursive: true });

    const fileName = (
        fileNameRaw || `${player.name}_${player.surname}_${Date.now()}`
    )
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_");

    const relativeUrl = `/generated-players/${fileName}.png`;
    const prompt = buildPlayerImagePrompt(player);

    // 1. Генерация портрета через OpenAI DALL-E 3
    let imageBuffer: Buffer;
    try {
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt,
            n: 1,
            size: "1024x1024",
            response_format: "b64_json",
        });

        const b64 = response.data[0]?.b64_json;
        if (!b64) {
            console.error("[OpenAI] Нет b64_json в ответе");
            return "";
        }
        imageBuffer = Buffer.from(b64, "base64");
    } catch (err) {
        console.error("[OpenAI] Ошибка генерации:", err);
        return "";
    }

    try {
        // 2. Пикселизация портрета: 1024 → 150 → 600 (nearest neighbor)
        const pixelatedPlayer = await sharp(imageBuffer)
            .ensureAlpha()
            .resize(150, 150, { kernel: "nearest", fit: "inside" })
            .resize(600, 600, {
                kernel: "nearest",
                fit: "contain",
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .png()
            .toBuffer();

        // 3. Текстовый слой (SVG → PNG)
        const textSvg = buildTextOverlay(player);
        const textPng = renderSvg(textSvg);

        // 4. Слои
        const overlays: {
            input: Buffer;
            top: number;
            left: number;
        }[] = [
            { input: pixelatedPlayer, top: 142, left: 132 },
            { input: textPng, top: 0, left: 0 },
        ];

        // 5. Рамка редкости (цветная полоса снизу или рамка)
        const rarityColor = RARITY_FRAME_COLORS[rarity];
        if (rarityColor) {
            const frameSvg = `
                <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="none"
                          stroke="${rarityColor}" stroke-width="8" rx="8" />
                </svg>`;
            const framePng = renderSvg(frameSvg);
            overlays.push({ input: framePng, top: 0, left: 0 });
        }

        // 6. Определяем шаблон карточки
        const templatePath = fs.existsSync(CARD_TEMPLATE)
            ? CARD_TEMPLATE
            : null;

        let finalBuffer: Buffer;

        if (templatePath) {
            // Есть шаблон — композит на него
            finalBuffer = await sharp(templatePath)
                .resize(CARD_WIDTH, CARD_HEIGHT, { fit: "cover" })
                .composite(overlays)
                .png()
                .toBuffer();
        } else {
            // Нет шаблона — делаем простой цветной фон под редкость
            const bgColor = rarityColor || "#CD7F32";
            const bgSvg = `
                <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
                    <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${bgColor}" rx="12" />
                    <rect x="20" y="20" width="${CARD_WIDTH - 40}" height="${CARD_HEIGHT - 40}" fill="#1a1a1a" rx="8" />
                </svg>`;
            const bgPng = renderSvg(bgSvg);
            finalBuffer = await sharp(bgPng)
                .composite(overlays)
                .png()
                .toBuffer();
        }

        // 7. Сохраняем
        fs.writeFileSync(path.resolve(`${PUBLIC_DIR}${fileName}.png`), finalBuffer);
        return relativeUrl;
    } catch (error) {
        console.error("[generatePlayerImage] ошибка обработки:", error);
        return "";
    }
}

const RARITY_FRAME_COLORS: Record<string, string> = {
    bronze: "#CD7F32",
    silver: "#C0C0C0",
    gold: "#FFD700",
};
