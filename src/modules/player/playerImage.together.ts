import fs from "fs";
import path from "path";
import sharp from "sharp";
import os from "os";
import { spawnSync } from "child_process";
import OpenAI from "openai";
import { Resvg } from "@resvg/resvg-js";

// ─── Ленивый OpenAI-клиент (не падает при сборке без ключа) ──────
function getOpenAI(): OpenAI | null {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return null;
    try {
        return new OpenAI({ apiKey: key });
    } catch {
        return null;
    }
}

// ─── Входные данные для карточки ──────────────────────────────────
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

// ─── Константы ────────────────────────────────────────────────────
const CARD_DIR = "./public/generated-players/";
const CARD_WIDTH = 853;
const CARD_HEIGHT = 1280;

const FONT_PATH = path.resolve("./assets/hud.otf");
const FONT_FAMILY = "Hud";
const CARD_TEMPLATE = path.resolve("./assets/background.jpg");
const BG_DIR = "./public/backgrounds/";
const FLAG_DIR = path.resolve("./assets/flags");
const CLUB_DIR = path.resolve("./assets/clubs");

const RARITY_BG: Record<string, string> = {
    bronze: "bg_bronze.png",
    silver: "bg_silver.png",
    gold: "bg_gold.png",
};

const RARITY_COLORS: Record<string, string> = {
    bronze: "#CD7F32",
    silver: "#C0C0C0",
    gold: "#FFD700",
};

// ─── Удаление фона (отдельный процесс) ────────────────────────────
function removeBgIsolated(pngBuffer: Buffer): Buffer | null {
    const tmpIn = path.join(os.tmpdir(), `bg_in_${Date.now()}.png`);
    const tmpOut = path.join(os.tmpdir(), `bg_out_${Date.now()}.png`);
    try {
        fs.writeFileSync(tmpIn, pngBuffer);
        const worker = path.resolve(__dirname, "bg-worker.mjs");
        const r = spawnSync("node", [worker, tmpIn, tmpOut], {
            stdio: ["ignore", "inherit", "inherit"],
            timeout: 120_000,
        });
        if (r.status === 0 && fs.existsSync(tmpOut))
            return fs.readFileSync(tmpOut);
        return null;
    } catch {
        return null;
    } finally {
        for (const f of [tmpIn, tmpOut]) {
            try {
                if (fs.existsSync(f)) fs.unlinkSync(f);
            } catch {}
        }
    }
}

// ─── SVG → PNG через Resvg ────────────────────────────────────────
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

// ─── Наложение фона редкости поверх шаблона ─────────────────────
async function overlayBackground(
    baseBuffer: Buffer,
    bgFilename: string,
): Promise<Buffer> {
    const bgFullPath = path.resolve(`${BG_DIR}${bgFilename}`);
    if (!fs.existsSync(bgFullPath)) return baseBuffer;
    try {
        const bg = await sharp(bgFullPath)
            .resize(CARD_WIDTH, CARD_HEIGHT, { fit: "cover" })
            .png()
            .toBuffer();
        return await sharp(baseBuffer)
            .composite([{ input: bg, top: 0, left: 0, blend: "over" }])
            .png()
            .toBuffer();
    } catch {
        return baseBuffer;
    }
}

// ─── SVG-текст: рейтинг, позиция, имя, статы ────────────────────
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
      <text x="140" y="287" lengthAdjust="spacingAndGlyphs" class="pixel-text rating">${player.overallRating}</text>
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

// ─── SVG-рамка редкости ──────────────────────────────────────────
function buildFrameOverlay(rarity: string): string {
    const color = RARITY_COLORS[rarity];
    if (!color) return "";
    return `
    <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}"
            fill="none" stroke="${color}" stroke-width="8" rx="8" />
    </svg>`.trim();
}

// ─── Промпт для DALL-E ───────────────────────────────────────────
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

// ─── Главная функция ──────────────────────────────────────────────
/**
 * Генерирует полноценную карточку игрока (853×1280):
 *  - DALL-E 3 → портрет
 *  - удаление фона (isolated process)
 *  - пикселизация (150 → 600, nearest neighbor)
 *  - текст: рейтинг, позиция, имя, статы (Resvg + Hud-шрифт)
 *  - флаг, эмблема клуба (по наличию файлов)
 *  - шаблон карточки (background.jpg)
 *  - цветная рамка по редкости
 *
 *  При отсутствии ключа или ошибках возвращает "".
 */
export async function generatePlayerImage(
    player: PlayerCardData,
    rarity: string = "bronze",
    fileNameRaw?: string,
): Promise<string> {
    const openai = getOpenAI();
    if (!openai) {
        console.log("[OpenAI] API key not set, skipping image generation");
        return "";
    }

    if (!fs.existsSync(CARD_DIR))
        fs.mkdirSync(CARD_DIR, { recursive: true });

    const fileName = (
        fileNameRaw || `${player.name}_${player.surname}_${Date.now()}`
    )
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_");

    const relativeUrl = `/generated-players/${fileName}.png`;
    const prompt = buildPlayerImagePrompt(player);

    // 1. Генерация портрета через OpenAI DALL-E 3
    let dalleBuffer: Buffer;
    try {
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt,
            n: 1,
            size: "1024x1024",
            response_format: "b64_json",
        });

        const b64 = response.data?.[0]?.b64_json;
        if (!b64) {
            console.error("[OpenAI] Нет b64_json в ответе");
            return "";
        }
        dalleBuffer = Buffer.from(b64, "base64");
    } catch (err) {
        console.error("[OpenAI] Ошибка генерации:", err);
        return "";
    }

    try {
        // 2. Удаление фона (изолированный процесс)
        const pngBuffer = await sharp(dalleBuffer).png().toBuffer();
        const noBg = removeBgIsolated(pngBuffer);
        const playerImage = noBg ?? pngBuffer;

        // 3. Пикселизация: → 150 → 600 (nearest neighbor, contain)
        const pixelatedPlayer = await sharp(playerImage)
            .ensureAlpha()
            .resize(150, 150, { kernel: "nearest", fit: "inside" })
            .resize(600, 600, {
                kernel: "nearest",
                fit: "contain",
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            })
            .png()
            .toBuffer();

        // 4. Текстовый слой (SVG → PNG)
        const textSvg = buildTextOverlay(player);
        const textPng = renderSvg(textSvg);

        // 5. Слои
        const overlays: { input: Buffer; top: number; left: number }[] = [
            { input: pixelatedPlayer, top: 142, left: 132 },
            { input: textPng, top: 0, left: 0 },
        ];

        // 6. Флаг страны (по clubId или nationality)
        const flagPath = path.join(FLAG_DIR, `${player.clubId || 0}.png`);
        if (fs.existsSync(flagPath)) {
            const flag = await sharp(flagPath)
                .resize(141, 85, { fit: "inside" })
                .png()
                .toBuffer();
            overlays.push({ input: flag, top: 445, left: 140 });
        }

        // 7. Эмблема клуба
        const clubPath = path.join(CLUB_DIR, `${player.clubId || 0}.png`);
        if (fs.existsSync(clubPath)) {
            const club = await sharp(clubPath)
                .resize(140, 140, { fit: "inside" })
                .png()
                .toBuffer();
            overlays.push({ input: club, top: 565, left: 138 });
        }

        // 8. Рамка редкости
        const frameSvg = buildFrameOverlay(rarity);
        if (frameSvg) {
            const framePng = renderSvg(frameSvg);
            overlays.push({ input: framePng, top: 0, left: 0 });
        }

        // 9. Шаблон карточки (или fallback)
        let finalBuffer: Buffer;
        const templatePath = fs.existsSync(CARD_TEMPLATE)
            ? CARD_TEMPLATE
            : null;

        if (templatePath) {
            // Шаблон карточки
            let composed = await sharp(templatePath)
                .resize(CARD_WIDTH, CARD_HEIGHT, { fit: "cover" })
                .png()
                .toBuffer();

            // Накладываем фон редкости поверх шаблона
            const bgName = RARITY_BG[rarity] || RARITY_BG.bronze;
            composed = await overlayBackground(composed, bgName);

            // Накладываем игрока, текст, рамку
            finalBuffer = await sharp(composed)
                .composite(overlays)
                .png()
                .toBuffer();
        } else {
            const bgColor = RARITY_COLORS[rarity] || "#CD7F32";
            const bgSvg = `
                <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
                    <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${bgColor}" rx="12" />
                    <rect x="20" y="20" width="${CARD_WIDTH - 40}" height="${CARD_HEIGHT - 40}" fill="#1a1a1a" rx="8" />
                </svg>`.trim();
            const bgPng = renderSvg(bgSvg);
            finalBuffer = await sharp(bgPng).composite(overlays).png().toBuffer();
        }

        // 10. Сохраняем
        fs.writeFileSync(path.resolve(`${CARD_DIR}${fileName}.png`), finalBuffer);
        return relativeUrl;
    } catch (error) {
        console.error("[generatePlayerImage] ошибка обработки:", error);
        return "";
    }
}
