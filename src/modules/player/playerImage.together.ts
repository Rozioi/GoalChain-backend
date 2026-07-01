import fs from "fs";
import path from "path";
import sharp from "sharp";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

const PUBLIC_DIR = "./public/generated-players/";
const BG_DIR = "./public/backgrounds/";

const RARITY_BG: Record<string, string> = {
    bronze: "bg_bronze.png",
    silver: "bg_silver.png",
    gold: "bg_gold.png",
};

export function buildPlayerImagePrompt(player: {
    name: string;
    surname: string;
    nationality: string;
    club: string;
}): string {
    return `Pixel art 16-bit SNES style frontal portrait, head and torso view of a male football player.
The player has appearance of ${player.nationality} nationality.
Wearing ${player.club} football kit.
The name "${player.name} ${player.surname}" in small pixel text below.
Solid white background. Looking directly at camera.
No logos, no watermarks, clean pixel art.`
        .replace(/\n\s+/g, "\n")
        .trim();
}

async function overlayBackground(
    playerBuffer: Buffer,
    bgFilename: string,
): Promise<Buffer> {
    const bgFullPath = path.resolve(`${BG_DIR}${bgFilename}`);
    if (!fs.existsSync(bgFullPath)) {
        return await sharp(playerBuffer).resize(512, 512).png().toBuffer();
    }
    try {
        const bg = await sharp(bgFullPath).resize(512, 512).png().toBuffer();
        return await sharp(bg)
            .composite([{ input: playerBuffer, top: 0, left: 0 }])
            .png()
            .toBuffer();
    } catch {
        return await sharp(playerBuffer).resize(512, 512).png().toBuffer();
    }
}

/**
 * Генерирует картинку игрока через OpenAI (DALL-E 3),
 * накладывает фон по редкости, пикселизирует и сохраняет.
 * Если ключа нет — возвращает "".
 */
export async function generatePlayerImage(
    player: {
        name: string;
        surname: string;
        nationality: string;
        club: string;
    },
    rarity: string = "bronze",
    fileNameRaw?: string,
): Promise<string> {
    if (!OPENAI_API_KEY) {
        console.log("[OpenAI] API key not set, skipping image generation");
        return "";
    }

    if (!fs.existsSync(PUBLIC_DIR))
        fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    if (!fs.existsSync(BG_DIR)) fs.mkdirSync(BG_DIR, { recursive: true });

    const fileName = (
        fileNameRaw || `${player.name}_${player.surname}_${Date.now()}`
    )
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_");

    const relativeUrl = `/generated-players/${fileName}.png`;
    const prompt = buildPlayerImagePrompt(player);

    // 1. Генерация через OpenAI DALL-E 3
    let imageBuffer: Buffer;
    try {
        const response = await fetch(
            "https://api.openai.com/v1/images/generations",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "dall-e-3",
                    prompt,
                    n: 1,
                    size: "1024x1024",
                    response_format: "b64_json",
                }),
            },
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("[OpenAI] Ошибка API:", data);
            return "";
        }

        const b64 = data.data?.[0]?.b64_json;
        if (!b64) {
            console.error("[OpenAI] Нет b64_json в ответе");
            return "";
        }

        imageBuffer = Buffer.from(b64, "base64");
    } catch (err) {
        console.error("[OpenAI] Ошибка генерации:", err);
        return "";
    }

    // 2. Пикселизация: ресайз с 1024 → 128 (nearest neighbor), затем обратно до 512
    try {
        const pixelated = await sharp(imageBuffer)
            .resize(128, 128, { kernel: "nearest" })
            .resize(512, 512, { kernel: "nearest" })
            .png()
            .toBuffer();

        // 3. Накладываем фон по редкости (поверх пикселизированного игрока)
        const bgName = RARITY_BG[rarity] || RARITY_BG.bronze;
        const withBg = await overlayBackground(pixelated, bgName);

        // 4. Сохраняем
        fs.writeFileSync(path.resolve(`${PUBLIC_DIR}${fileName}.png`), withBg);
        return relativeUrl;
    } catch (error) {
        console.error("[generatePlayerImage] ошибка обработки:", error);
        return "";
    }
}
