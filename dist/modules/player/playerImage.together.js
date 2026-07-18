"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assembleCardFromPlayerBuffer = assembleCardFromPlayerBuffer;
exports.regeneratePlayerCard = regeneratePlayerCard;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const resvg_js_1 = require("@resvg/resvg-js");
const player_avatar_1 = require("./player.avatar");
// ─── Константы ────────────────────────────────────────────────────
const CARD_DIR = "./public/generated-players/";
const CARD_WIDTH = 853;
const CARD_HEIGHT = 1280;
const FONT_PATH = path_1.default.resolve("./assets/hud.otf");
const FONT_FAMILY = "Hud";
const BG_DIR = "./assets/";
const FLAG_DIR = path_1.default.resolve("./assets/flags");
const CLUB_DIR = path_1.default.resolve("./assets/clubs");
const RARITY_BG = {
    bronze: "bronze_bg.png",
    silver: "silver_bg.png",
    gold: "gold_bg.png",
};
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
      <text x="443" y="830" class="pixel-text name">${nameDisplay.slice(0, 12)}</text>
      <text x="160" y="892"  class="pixel-text stat">${player.pace} PAC</text>
      <text x="164" y="980"  class="pixel-text stat">${player.shooting} SHO</text>
      <text x="164" y="1070" class="pixel-text stat">${player.passing} PAS</text>
      <text x="490" y="892"  class="pixel-text stat">${player.dribbling} DRI</text>
      <text x="490" y="980"  class="pixel-text stat">${player.defending} DEF</text>
      <text x="490" y="1070" class="pixel-text stat">${player.physical} PHY</text>
    </svg>`.trim();
}
// ─── Общая сборка слоев карточки ──────────────────────────────────
async function assembleCardFromPlayerBuffer(playerImageBuffer, player, rarity, fileName) {
    // 1. Пикселизация игрока
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
    // 2. Текстовый слой
    const textSvg = buildTextOverlay(player);
    const textPng = renderSvg(textSvg);
    // 3. Слои
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
    // 4. Фон редкости
    const bgName = RARITY_BG[rarity] || RARITY_BG.bronze;
    const bgPath = path_1.default.resolve(`${BG_DIR}${bgName}`);
    let finalBuffer;
    if (fs_1.default.existsSync(bgPath)) {
        finalBuffer = await (0, sharp_1.default)(bgPath)
            .resize(CARD_WIDTH, CARD_HEIGHT, { fit: "cover" })
            .composite(overlays)
            .png()
            .toBuffer();
    }
    else {
        const bgSvg = `
            <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
                <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="#1a1a1a" rx="12" />
            </svg>`.trim();
        const bgPng = renderSvg(bgSvg);
        finalBuffer = await (0, sharp_1.default)(bgPng).composite(overlays).png().toBuffer();
    }
    // 5. Сохранение
    const outputPath = path_1.default.resolve(`${CARD_DIR}${fileName}.png`);
    fs_1.default.writeFileSync(outputPath, finalBuffer);
    return `https://goalchain-backend-production.up.railway.app/generated-players/${fileName}.png`;
}
// ─── Перегенерация карточки игрока ────────────────────────────────
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
    // Load avatar from IPFS URL or legacy local path
    const facePath = player.face || "";
    const playerBuffer = await (0, player_avatar_1.loadAvatarBufferWithFallback)(facePath);
    const imageUrl = await assembleCardFromPlayerBuffer(playerBuffer, cardData, rarity, fileName);
    if (!imageUrl)
        return null;
    return imageUrl;
}
