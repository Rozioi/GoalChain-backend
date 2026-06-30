import Together from "together-ai";
import fs from "fs";
import path from "path";
import sharp from "sharp";

const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY || "";

const together = TOGETHER_API_KEY ? new Together() : null;

const PUBLIC_DIR = "./public/generated-players/";
const BG_DIR = "./public/backgrounds/";

// Фоны по редкости
const RARITY_BG: Record<string, string> = {
    bronze: "bg_bronze.png",
    silver: "bg_silver.png",
    gold: "bg_gold.png",
};

/**
 * Строит промпт для пиксель-арт портрета игрока.
 */
export function buildPlayerImagePrompt(player: {
    name: string;
    surname: string;
    nationality: string;
    club: string;
}): string {
    return `Pixel art 16-bit SNES style frontal portrait, head and torso view of a male football player.
The player's physical appearance accurately reflect nationality: ${player.nationality}.
The player is wearing a ${player.club} club football kit.
The name "${player.name} ${player.surname}" in small pixel text below.
Background is solid white. Direct frontal gaze at camera.`
        .replace(/\n\s+/g, "\n")
        .trim();
}

/**
 * Накладывает фон поверх картинки и возвращает буфер.
 */
async function overlayBackground(
    playerBuffer: Buffer,
    bgFilename: string,
): Promise<Buffer> {
    const bgFullPath = path.resolve(`${BG_DIR}${bgFilename}`);
    if (!fs.existsSync(bgFullPath)) {
        // Если фона нет — просто возвращаем
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
 * Генерирует картинку игрока через Together AI (если есть ключ),
 * иначе возвращает "" — клиент покажет default.png.
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
    // Если нет ключа — не генерируем
    if (!together || !TOGETHER_API_KEY) {
        console.log("[Together] API key not set, skipping image generation");
        return "";
    }

    // Создаём папки если нет
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

    // 1. Генерация через Together AI
    let imageBuffer: Buffer;
    try {
        const response = await (together as any).images.create({
            model: "black-forest-labs/FLUX.1-schnell-Free",
            prompt,
            width: 512,
            height: 512,
            steps: 4,
            n: 1,
            response_format: "base64",
        });

        const b64 = (response as any).data?.[0]?.b64_json;
        if (b64) {
            imageBuffer = Buffer.from(b64, "base64");
        } else {
            const url = (response as any).data?.[0]?.url;
            if (!url) throw new Error("Together: пустой ответ");
            const res = await fetch(url);
            imageBuffer = Buffer.from(await res.arrayBuffer());
        }
    } catch (err) {
        console.error("[Together] Ошибка генерации:", err);
        return "";
    }

    // 2. Пикселизация
    try {
        const pixelated = await sharp(imageBuffer)
            .resize(128, 128, { kernel: sharp.kernel.nearest })
            .resize(512, 512, { kernel: sharp.kernel.nearest })
            .png()
            .toBuffer();

        // 3. Накладываем фон по редкости
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
