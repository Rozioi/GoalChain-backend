import Together from "together-ai";
import fs from "fs";
import path from "path";
import sharp from "sharp";
// Инициализация (ключ берётся из process.env.TOGETHER_API_KEY)
const together = new Together();

/**
 * Строит промпт для пиксель-арт портрета игрока.
 */
export function buildPlayerImagePrompt(player: {
  name: string;
  surname: string;
  nationality: string;
  club: string;
}): string {
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
export async function generatePlayerImage(
  player: { name: string; surname: string; nationality: string; club: string },
  fileNameRaw?: string,
): Promise<string> {
  const publicDir = "./public/generated-players/";
  const tempDir = "./temp/bg-removal/";
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

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
    const response = await together.images.create({
      model: "black-forest-labs/FLUX.1-schnell-Free", // можно FLUX.1-schnell / FLUX.1.1-pro
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
      // fallback: если вернулся url
      const url = (response as any).data?.[0]?.url;
      if (!url) throw new Error("Together: пустой ответ (нет b64_json и url)");
      const res = await fetch(url);
      imageBuffer = Buffer.from(await res.arrayBuffer());
    }
  } catch (err) {
    console.error("[Together] Ошибка генерации:", err);
    return ""; // вызывающий код сам решит, что делать с пустым imageUrl
  }

  // 2. Обработка: нормализация -> удаление фона -> пикселизация
  try {
    const normalizedBuffer = await sharp(imageBuffer).png().toBuffer();

    const tempPath = path.resolve(`${tempDir}${fileName}_temp.png`);
    fs.writeFileSync(tempPath, normalizedBuffer);

    let resultBuffer = normalizedBuffer;
    try {
      const blob = await removeBackground(tempPath);
      resultBuffer = Buffer.from(await blob.arrayBuffer());
    } catch (bgError) {
      console.warn("[BG Removal] пропускаю удаление фона:", bgError);
    } finally {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }

    const pixelated = await sharp(resultBuffer)
      .resize(128, 128, { kernel: sharp.kernel.nearest })
      .resize(512, 512, { kernel: sharp.kernel.nearest })
      .png()
      .toBuffer();

    fs.writeFileSync(path.resolve(`${publicDir}${fileName}.png`), pixelated);
    return relativeUrl;
  } catch (error) {
    console.error("[generatePlayerImage] ошибка обработки:", error);
    return "";
  }
}
