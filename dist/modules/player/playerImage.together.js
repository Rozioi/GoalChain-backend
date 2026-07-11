"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPlayerImagePrompt = buildPlayerImagePrompt;
exports.generatePlayerImageMock = generatePlayerImageMock;
exports.regeneratePlayerCard = regeneratePlayerCard;
exports.generatePlayerImage = generatePlayerImage;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const os_1 = __importDefault(require("os"));
const child_process_1 = require("child_process");
const openai_1 = __importDefault(require("openai"));
const resvg_js_1 = require("@resvg/resvg-js");
// ─── Ленивый OpenAI-клиент (не падает при сборке без ключа) ──────
function getOpenAI() {
    let key = process.env.OPENAI_API_KEY;
    // Если ключа нет, или это пустая строка, или это строки "null"/"undefined"
    if (!key || key.trim() === "" || key === "null" || key === "undefined") {
        return null;
    }
    try {
        return new openai_1.default({ apiKey: key });
    }
    catch {
        return null;
    }
}
// ─── Константы ────────────────────────────────────────────────────
const CARD_DIR = "./public/generated-players/";
const CARD_WIDTH = 853;
const CARD_HEIGHT = 1280;
const FONT_PATH = path_1.default.resolve("./assets/hud.otf");
const FONT_FAMILY = "Hud";
const CARD_TEMPLATE = path_1.default.resolve("./assets/background.jpg");
const BG_DIR = "./assets/";
const FLAG_DIR = path_1.default.resolve("./assets/flags");
const CLUB_DIR = path_1.default.resolve("./assets/clubs");
const RARITY_BG = {
    bronze: "bronze_bg.png",
    silver: "silver_bg.png",
    gold: "gold_bg.png",
};
const RARITY_COLORS = {
    bronze: "#CD7F32",
    silver: "#C0C0C0",
    gold: "#FFD700",
};
// ─── Удаление фона (отдельный процесс) ────────────────────────────
function removeBgIsolated(pngBuffer) {
    const tmpIn = path_1.default.join(os_1.default.tmpdir(), `bg_in_${Date.now()}.png`);
    const tmpOut = path_1.default.join(os_1.default.tmpdir(), `bg_out_${Date.now()}.png`);
    try {
        fs_1.default.writeFileSync(tmpIn, pngBuffer);
        const worker = path_1.default.resolve(__dirname, "bg-worker.mjs");
        const r = (0, child_process_1.spawnSync)("node", [worker, tmpIn, tmpOut], {
            stdio: ["ignore", "inherit", "inherit"],
            timeout: 120000,
        });
        if (r.status === 0 && fs_1.default.existsSync(tmpOut))
            return fs_1.default.readFileSync(tmpOut);
        return null;
    }
    catch {
        return null;
    }
    finally {
        for (const f of [tmpIn, tmpOut]) {
            try {
                if (fs_1.default.existsSync(f))
                    fs_1.default.unlinkSync(f);
            }
            catch { }
        }
    }
}
// ─── SVG → PNG через Resvg ────────────────────────────────────────
function renderSvg(svg) {
    const hasFont = fs_1.default.existsSync(FONT_PATH);
    const resvg = new resvg_js_1.Resvg(svg, {
        font: {
            fontFiles: hasFont ? [FONT_PATH] : [],
            loadSystemFonts: !hasFont,
            defaultFontFamily: FONT_FAMILY,
        },
    });
    return resvg.render().asPng();
}
// ─── Наложение фона редкости поверх шаблона ─────────────────────
async function overlayBackground(baseBuffer, bgFilename) {
    const bgFullPath = path_1.default.resolve(`${BG_DIR}${bgFilename}`);
    if (!fs_1.default.existsSync(bgFullPath))
        return baseBuffer;
    try {
        const bg = await (0, sharp_1.default)(bgFullPath)
            .resize(CARD_WIDTH, CARD_HEIGHT, { fit: "cover" })
            .png()
            .toBuffer();
        return await (0, sharp_1.default)(baseBuffer)
            .composite([{ input: bg, top: 0, left: 0, blend: "over" }])
            .png()
            .toBuffer();
    }
    catch {
        return baseBuffer;
    }
}
// ─── SVG-текст: рейтинг, позиция, имя, статы ────────────────────
function buildTextOverlay(player) {
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
// ─── Промпт для DALL-E ───────────────────────────────────────────
function buildPlayerImagePrompt(player) {
    return `Pixel art 16-bit SNES style frontal portrait, head and torso view of a male football player.
The player has appearance of ${player.nationality} nationality.
Wearing ${player.club} football kit.
Solid white background. Looking directly at camera.
No logos, no watermarks, clean pixel art.`
        .replace(/\n\s+/g, "\n")
        .trim();
}
// ─── Общая сборка слоев карточки (Чистый фон, без рамок) ──────────
// ─── Общая сборка слоев карточки (Сборка СРАЗУ на фоне редкости) ───
async function assembleCardFromPlayerBuffer(playerImageBuffer, player, rarity, fileName) {
    // 1. Пикселизация игрока (сохраняем альфа-канал прозрачности)
    const pixelatedPlayer = await (0, sharp_1.default)(playerImageBuffer)
        .ensureAlpha()
        .resize(150, 150, { kernel: "nearest", fit: "inside" })
        .resize(600, 600, {
        kernel: "nearest",
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
        .png()
        .toBuffer();
    // 2. Текстовый слой (SVG → PNG)
    const textSvg = buildTextOverlay(player);
    const textPng = renderSvg(textSvg);
    // 3. Массив базовых слоев (Игрок + Текст)
    const overlays = [
        { input: pixelatedPlayer, top: 142, left: 132 },
        { input: textPng, top: 0, left: 0 },
    ];
    // Флаг страны
    const flagPath = path_1.default.join(FLAG_DIR, `${player.clubId || 0}.png`);
    if (fs_1.default.existsSync(flagPath)) {
        const flag = await (0, sharp_1.default)(flagPath)
            .resize(141, 85, { fit: "inside" })
            .png()
            .toBuffer();
        overlays.push({ input: flag, top: 445, left: 140 });
    }
    // Эмблема клуба
    const clubPath = path_1.default.join(CLUB_DIR, `${player.clubId || 0}.png`);
    if (fs_1.default.existsSync(clubPath)) {
        const club = await (0, sharp_1.default)(clubPath)
            .resize(140, 140, { fit: "inside" })
            .png()
            .toBuffer();
        overlays.push({ input: club, top: 565, left: 138 });
    }
    // 4. ОПРЕДЕЛЯЕМ ЦЕЛЕВОЙ ФОН
    const bgName = RARITY_BG[rarity] || RARITY_BG.bronze; // например, gold_bg.png
    const rarityBgPath = path_1.default.resolve(`${BG_DIR}${bgName}`); // путь к фону редкости
    let selectedTemplatePath = null;
    if (fs_1.default.existsSync(rarityBgPath)) {
        // Если есть файл под конкретную редкость (gold_bg.png), берем его
        selectedTemplatePath = rarityBgPath;
    }
    else if (fs_1.default.existsSync(CARD_TEMPLATE)) {
        // Если фона редкости нет, берем общий background.jpg как fallback
        selectedTemplatePath = CARD_TEMPLATE;
    }
    let finalBuffer;
    if (selectedTemplatePath) {
        // Загружаем выбранный фон (уже без бутерброда из двух картинок)
        finalBuffer = await (0, sharp_1.default)(selectedTemplatePath)
            .resize(CARD_WIDTH, CARD_HEIGHT, { fit: "cover" })
            .composite(overlays)
            .png()
            .toBuffer();
    }
    else {
        // Крайний случай: если вообще никаких картинок фонов нет в ассетах
        const bgSvg = `
            <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
                <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="#1a1a1a" rx="12" />
            </svg>`.trim();
        const bgPng = renderSvg(bgSvg);
        finalBuffer = await (0, sharp_1.default)(bgPng).composite(overlays).png().toBuffer();
    }
    // 5. Сохранение
    fs_1.default.writeFileSync(path_1.default.resolve(`${CARD_DIR}${fileName}.png`), finalBuffer);
    return `https://goalchain-backend-production.up.railway.app/generated-players/${fileName}.png`;
}
// ─── ТЕСТОВАЯ ФУНКЦИЯ (Локальный файл assets/player.png) ──────────
/**
 * Мгновенно собирает карточку на основе локального файла assets/player.png.
 * Рекомендуется использовать PNG с прозрачным фоном.
 */
async function generatePlayerImageMock(player, rarity = "bronze", fileNameRaw) {
    if (!fs_1.default.existsSync(CARD_DIR))
        fs_1.default.mkdirSync(CARD_DIR, { recursive: true });
    const fileName = (fileNameRaw || `test_${player.name}_${player.surname}_${Date.now()}`)
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_");
    try {
        // Путь изменен на player.png (лучше подготовить прозрачный PNG)
        const targetSourcePath = path_1.default.resolve("./assets/player.png");
        if (!fs_1.default.existsSync(targetSourcePath)) {
            console.error(`[Mock] ОШИБКА: Файл не найден по пути: ${targetSourcePath}. Создана прозрачная заглушка.`);
        }
        const rawBuffer = fs_1.default.existsSync(targetSourcePath)
            ? fs_1.default.readFileSync(targetSourcePath)
            : await (0, sharp_1.default)({
                create: {
                    width: 512,
                    height: 512,
                    channels: 4,
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                }
            }).png().toBuffer();
        return await assembleCardFromPlayerBuffer(rawBuffer, player, rarity, fileName);
    }
    catch (error) {
        console.error("[generatePlayerImageMock] Ошибка генерации мок-карточки:", error);
        return "";
    }
}
// ─── Перегенерация карточки игрока (перезаписывает файл) ──────────
async function regeneratePlayerCard(playerId, app) {
    const player = await app.prisma.player.findUnique({
        where: { id: playerId },
    });
    if (!player)
        return null;
    if (!fs_1.default.existsSync(CARD_DIR))
        fs_1.default.mkdirSync(CARD_DIR, { recursive: true });
    const cardData = {
        name: player.name,
        surname: player.surname || "",
        nationality: player.nationality,
        club: player.club,
        clubId: player.clubId ?? undefined,
        overallRating: player.overallRating,
        position: player.position,
        pace: player.pace,
        shooting: player.shooting,
        passing: player.passing,
        dribbling: player.dribbling,
        defending: player.defending,
        physical: player.physical,
    };
    const rarity = player.rarity || "bronze";
    const fileName = `${player.name}_${player.surname}`
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_');
    const imageUrl = await generatePlayerImage(cardData, rarity, fileName);
    if (!imageUrl)
        return null;
    return imageUrl;
}
// ─── Главная функция (Генерация OpenAI + Авто-Мок фолбек) ──────────
async function generatePlayerImage(player, rarity = "bronze", fileNameRaw) {
    const openai = getOpenAI();
    // Если ключа нет или он невалидный — железно уходим в мок
    if (!openai) {
        console.log("[OpenAI] API key missing/invalid. Falling back to Mock version!");
        return generatePlayerImageMock(player, rarity, fileNameRaw);
    }
    if (!fs_1.default.existsSync(CARD_DIR))
        fs_1.default.mkdirSync(CARD_DIR, { recursive: true });
    const fileName = (fileNameRaw || `${player.name}_${player.surname}_${Date.now()}`)
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_");
    const prompt = buildPlayerImagePrompt(player);
    let dalleBuffer;
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
            throw new Error("Нет b64_json в ответе от OpenAI");
        }
        dalleBuffer = Buffer.from(b64, "base64");
        const pngBuffer = await (0, sharp_1.default)(dalleBuffer).png().toBuffer();
        const noBg = removeBgIsolated(pngBuffer);
        const playerImage = noBg ?? pngBuffer;
        return await assembleCardFromPlayerBuffer(playerImage, player, rarity, fileName);
    }
    catch (err) {
        // Подстраховка: если запрос к OpenAI упал (401, кончились деньги), тоже отдаем мок, чтобы не падал сервер
        console.error("[OpenAI] Ошибка генерации. Переключаемся на Mock!", err);
        return generatePlayerImageMock(player, rarity, fileNameRaw);
    }
}
