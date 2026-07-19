import fs from "fs";
import path from "path";
import sharp from "sharp";
import { Resvg } from "@resvg/resvg-js";
import type { FastifyInstance } from "fastify";
import { env } from "../../config/env";

// ─── Извлекает CID из любого IPFS-URL ─────────────────────────────
// Поддерживает форматы:
//   https://ipfs.io/ipfs/{cid}/file
//   https://{cid}.ipfs.inbrowser.link/file
//   https://blush-giant-planarian-701.mypinata.cloud/ipfs/{cid}/file
//   /ipfs/{cid}/file
function extractIpfsCid(url: string): string | null {
    // ipfs/{cid} — стандартный шлюз
    const m1 = url.match(/ipfs\/([a-zA-Z0-9]+)/);
    if (m1) return m1[1];
    // {cid}.ipfs.inbrowser.link — subdomain gateway
    const m2 = url.match(/([a-zA-Z0-9]+)\.ipfs\./);
    if (m2) return m2[1];
    return null;
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
    face?: string;
}

// ─── Константы ────────────────────────────────────────────────────
const CARD_DIR = "./public/generated-players/";
const CARD_WIDTH = 853;
const CARD_HEIGHT = 1280;

const FONT_PATH = path.resolve("./assets/hud.otf");
const FONT_FAMILY = "Hud";
const BG_DIR = "./assets/";
const FLAG_DIR = path.resolve("./assets/flags");
const CLUB_DIR = path.resolve("./assets/clubs");

const RARITY_BG: Record<string, string> = {
    bronze: "bronze_bg.png",
    silver: "silver_bg.png",
    gold: "gold_bg.png",
};

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
export async function assembleCardFromPlayerBuffer(
    player: PlayerCardData,
    rarity: string,
    fileName: string
): Promise<string> {
    // 1. Загружаем аватар — с локального диска или по IPFS
    let avatarPath: string | null = null;
    if (player.face) {
        if (player.face.startsWith("/cards/")) {
            // Локальный файл из assets/cards
            const resolvedPath = path.join(process.cwd(), `assets${player.face}`);
            if (fs.existsSync(resolvedPath)) {
                avatarPath = resolvedPath;
            }
        } else if (player.face.startsWith("http://") || player.face.startsWith("https://")) {
            // IPFS/HTTP — пробуем разные шлюзы
            const ipfsCid = extractIpfsCid(player.face);
            const gatewayUrls = ipfsCid ? [
                `https://ipfs.io/ipfs/${ipfsCid}`,
                `https://cloudflare-ipfs.com/ipfs/${ipfsCid}`,
                `https://dweb.link/ipfs/${ipfsCid}`,
                `https://${ipfsCid}.ipfs.inbrowser.link`,
                `https://4everland.io/ipfs/${ipfsCid}`,
                `https://nftstorage.link/ipfs/${ipfsCid}`,
                `https://w3s.link/ipfs/${ipfsCid}`,
            ] : [];

            const urlsToTry = [player.face, ...gatewayUrls];
            for (const url of urlsToTry) {
                try {
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 8000);
                    const resp = await fetch(url, { signal: controller.signal });
                    clearTimeout(timeout);
                    if (!resp.ok) continue;
                    const contentType = resp.headers.get("content-type") || "";
                    if (!contentType.startsWith("image/")) continue;
                    const buf = Buffer.from(await resp.arrayBuffer());
                    if (buf.length < 100) continue;

                    const tmpDir = path.resolve("./tmp/avatars");
                    fs.mkdirSync(tmpDir, { recursive: true });
                    avatarPath = path.join(tmpDir, `${fileName}_avatar.png`);
                    fs.writeFileSync(avatarPath, buf);
                    break;
                } catch { /* пробуем следующий */ }
            }
        } else {
            // Локальный файл — абсолютный или относительный путь
            const resolvedPath = path.resolve(player.face);
            if (fs.existsSync(resolvedPath)) {
                avatarPath = resolvedPath;
            } else {
                console.warn(`[assembleCard] Avatar file not found (else): ${resolvedPath}`);
            }
        }
    }

    // Читаем аватар: с диска или прозрачный фон
    let playerBuffer: Buffer;
    const sharpInstance = (await import("sharp")).default;
    if (avatarPath && fs.existsSync(avatarPath)) {
        playerBuffer = await sharpInstance(avatarPath).png().toBuffer();
    } else {
        playerBuffer = await sharpInstance({
            create: {
                width: 256, height: 256, channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 },
            },
        }).png().toBuffer();
    }

    // 2. Пикселизация
    const pixelatedPlayer = await sharp(playerBuffer)
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
    const overlays: { input: Buffer; top: number; left: number }[] = [
        { input: pixelatedPlayer, top: 142, left: 132 },
        { input: textPng, top: 0, left: 0 },
    ];

    // Флаг страны
    const flagPath = path.join(FLAG_DIR, `${player.clubId || 0}.png`);
    if (fs.existsSync(flagPath)) {
        const flag = await sharp(flagPath)
            .resize(141, 85, { fit: "inside" })
            .png()
            .toBuffer();
        overlays.push({ input: flag, top: 445, left: 140 });
    }

    // Эмблема клуба
    const clubPath = path.join(CLUB_DIR, `${player.clubId || 0}.png`);
    if (fs.existsSync(clubPath)) {
        const club = await sharp(clubPath)
            .resize(140, 140, { fit: "inside" })
            .png()
            .toBuffer();
        overlays.push({ input: club, top: 565, left: 138 });
    }

    // 4. Фон редкости
    const bgName = RARITY_BG[rarity] || RARITY_BG.bronze;
    const bgPath = path.resolve(`${BG_DIR}${bgName}`);

    let finalBuffer: Buffer;

    if (fs.existsSync(bgPath)) {
        finalBuffer = await sharp(bgPath)
            .resize(CARD_WIDTH, CARD_HEIGHT, { fit: "cover" })
            .composite(overlays)
            .png()
            .toBuffer();
    } else {
        const bgSvg = `
            <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
                <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="#1a1a1a" rx="12" />
            </svg>`.trim();
        const bgPng = renderSvg(bgSvg);
        finalBuffer = await sharp(bgPng).composite(overlays).png().toBuffer();
    }

    // 5. Сохранение карточки в файл
    const outputPath = path.resolve(`${CARD_DIR}${fileName}.png`);
    fs.mkdirSync(CARD_DIR, { recursive: true });
    fs.writeFileSync(outputPath, finalBuffer);

    // 6. Удаляем временный файл аватара
    if (avatarPath) {
        try { fs.unlinkSync(avatarPath); } catch { /* не критично */ }
    }

    // Локально — отдаём через локальный сервер, на Railway — через домен
    const baseUrl = env.NODE_ENV === "production"
        ? "https://goalchain-backend-production.up.railway.app"
        : `http://localhost:${env.PORT}`;
    return `${baseUrl}/generated-players/${fileName}.png`;
}

// ─── Перегенерация карточки игрока ────────────────────────────────
export async function regeneratePlayerCard(
    playerId: string,
    app: FastifyInstance,
): Promise<string | null> {
    const player = await app.prisma.player.findUnique({
        where: { id: playerId },
    });
    if (!player) return null;

    if (!fs.existsSync(CARD_DIR))
        fs.mkdirSync(CARD_DIR, { recursive: true });

    const cardData: PlayerCardData = {
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
        face: player.face || undefined,
    };

    const rarity = player.rarity || "bronze";
    const safeName = `${player.name}_${player.surname}`
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_');
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const fileName = `${safeName}_${uniqueSuffix}`;

    const imageUrl = await assembleCardFromPlayerBuffer(cardData, rarity, fileName);
    if (!imageUrl) return null;

    return imageUrl;
}
