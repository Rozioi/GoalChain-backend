"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPlayerImagePrompt = buildPlayerImagePrompt;
exports.generatePlayerImage = generatePlayerImage;
const together_ai_1 = __importDefault(require("together-ai"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sharp_1 = __importDefault(require("sharp"));
// Инициализация (ключ берётся из process.env.TOGETHER_API_KEY)
const together = new together_ai_1.default();
/**
 * Строит промпт для пиксель-арт портрета игрока.
 */
function buildPlayerImagePrompt(player) {
    const nationality = player.nationality;
    const club_name = player.club;
    return `Pixel art 16-bit SNES style frontal portrait, head and torso view of a male football player.

The player's physical appearance, including skin tone, hair color, texture, and facial structure, must accurately reflect their specific nationality: ${nationality}.

The player is wearing a detailed pixel art ${club_name} club football kit, featuring its signature dark blue color scheme with red and white accents, with all club logos and sponsor branding stylized in pixel art.

The name "${player.name} ${player.surname}" is subtly rendered in small, clean pixel art text below the main portrait area. The overall style is that of a premium, detailed in-game character sprite.

The background is a clean, solid white. The pose is a direct frontal gaze at the camera.`
        .replace(/\n\s*\n/g, "\n")
        .trim();
}
/**
 * Генерирует картинку игрока через Together AI (FLUX),
 * обрабатывает (удаление фона + пикселизация) и сохраняет в public.
 * Возвращает относительный URL для сохранения в БД (player.imageUrl).
 */
async function generatePlayerImage(player, fileNameRaw) {
    const publicDir = "./public/generated-players/";
    const tempDir = "./temp/bg-removal/";
    if (!fs_1.default.existsSync(publicDir))
        fs_1.default.mkdirSync(publicDir, { recursive: true });
    if (!fs_1.default.existsSync(tempDir))
        fs_1.default.mkdirSync(tempDir, { recursive: true });
    const fileName = (fileNameRaw || `${player.name}_${player.surname}_${Date.now()}`)
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_");
    const relativeUrl = `/generated-players/${fileName}.png`;
    const prompt = buildPlayerImagePrompt(player);
    // 1. Генерация через Together AI
    let imageBuffer;
    try {
        const response = await together.images.create({
            model: "black-forest-labs/FLUX.1-schnell-Free", // можно FLUX.1-schnell / FLUX.1.1-pro
            prompt,
            width: 512,
            height: 512,
            steps: 4,
            n: 1,
            response_format: "base64",
        });
        const b64 = response.data?.[0]?.b64_json;
        if (b64) {
            imageBuffer = Buffer.from(b64, "base64");
        }
        else {
            // fallback: если вернулся url
            const url = response.data?.[0]?.url;
            if (!url)
                throw new Error("Together: пустой ответ (нет b64_json и url)");
            const res = await fetch(url);
            imageBuffer = Buffer.from(await res.arrayBuffer());
        }
    }
    catch (err) {
        console.error("[Together] Ошибка генерации:", err);
        return ""; // вызывающий код сам решит, что делать с пустым imageUrl
    }
    // 2. Обработка: нормализация -> удаление фона -> пикселизация
    try {
        const normalizedBuffer = await (0, sharp_1.default)(imageBuffer).png().toBuffer();
        const tempPath = path_1.default.resolve(`${tempDir}${fileName}_temp.png`);
        fs_1.default.writeFileSync(tempPath, normalizedBuffer);
        let resultBuffer = normalizedBuffer;
        try {
            const blob = await removeBackground(tempPath);
            resultBuffer = Buffer.from(await blob.arrayBuffer());
        }
        catch (bgError) {
            console.warn("[BG Removal] пропускаю удаление фона:", bgError);
        }
        finally {
            if (fs_1.default.existsSync(tempPath))
                fs_1.default.unlinkSync(tempPath);
        }
        const pixelated = await (0, sharp_1.default)(resultBuffer)
            .resize(128, 128, { kernel: sharp_1.default.kernel.nearest })
            .resize(512, 512, { kernel: sharp_1.default.kernel.nearest })
            .png()
            .toBuffer();
        fs_1.default.writeFileSync(path_1.default.resolve(`${publicDir}${fileName}.png`), pixelated);
        return relativeUrl;
    }
    catch (error) {
        console.error("[generatePlayerImage] ошибка обработки:", error);
        return "";
    }
}
