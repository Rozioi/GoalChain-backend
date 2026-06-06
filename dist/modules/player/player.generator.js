"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePlayer = generatePlayer;
exports.generateMultiplePlayers = generateMultiplePlayers;
const seedrandom_1 = __importDefault(require("seedrandom"));
const client_1 = require("@prisma/client");
const constants_1 = require("../../config/constants");
const background_removal_node_1 = require("@imgly/background-removal-node");
const fs_1 = __importDefault(require("fs"));
const sharp_1 = __importDefault(require("sharp"));
const path_1 = __importDefault(require("path"));
const LOCAL_AI_URL = process.env.LOCAL_AI_URL; // Например, http://127.0.0.1:7860/sdapi/v1/txt2img
async function fetchLocalImage(prompt) {
    if (!LOCAL_AI_URL)
        throw new Error("LOCAL_AI_URL is not set");
    const response = await fetch(LOCAL_AI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            prompt,
            negative_prompt: "blurry, low quality, distorted, extra limbs, bad anatomy, text, watermark",
            steps: 25,
            width: 512,
            height: 512,
            cfg_scale: 7,
            sampler_name: "Euler a",
        }),
    });
    if (!response.ok)
        throw new Error(`Local AI error: ${response.statusText}`);
    const data = await response.json();
    // Automatic1111 возвращает base64 в массиве images
    return Buffer.from(data.images[0], "base64");
}
async function processPlayerImage(promptOrUrl, fileName, isUrl = true) {
    const publicDir = "./public/generated-players/";
    const relativeUrl = `/generated-players/${fileName}.png`;
    let imageBuffer = null;
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            if (isUrl) {
                console.log(`[Pollinations] Попытка ${attempt} для ${fileName}`);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 20000);
                const response = await fetch(promptOrUrl, {
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                if (response.ok) {
                    imageBuffer = Buffer.from(await response.arrayBuffer());
                    break;
                }
            }
            else {
                console.log(`[LocalAI] Попытка ${attempt} для ${fileName}`);
                imageBuffer = await fetchLocalImage(promptOrUrl);
                break;
            }
        }
        catch (err) {
            lastError = err;
            console.warn(`[ImageGen] Ошибка при попытке ${attempt}:`, err);
            if (attempt < 3)
                await new Promise((r) => setTimeout(r, 2000));
        }
    }
    if (!imageBuffer) {
        console.error("[processPlayerImage] Не удалось получить изображение:", lastError);
        return isUrl ? promptOrUrl : "";
    }
    try {
        if (!fs_1.default.existsSync(publicDir))
            fs_1.default.mkdirSync(publicDir, { recursive: true });
        // Нормализуем изображение через sharp перед удалением фона
        const normalizedBuffer = await (0, sharp_1.default)(imageBuffer).png().toBuffer();
        const tempDir = "./temp/bg-removal/";
        if (!fs_1.default.existsSync(tempDir))
            fs_1.default.mkdirSync(tempDir, { recursive: true });
        const tempPath = path_1.default.resolve(`${tempDir}${fileName}_temp.png`);
        fs_1.default.writeFileSync(tempPath, normalizedBuffer);
        let resultBuffer = normalizedBuffer;
        try {
            console.log(`[ImageGen] Удаление фона через файл: ${tempPath}`);
            const resultBlob = await (0, background_removal_node_1.removeBackground)(tempPath);
            resultBuffer = Buffer.from(await resultBlob.arrayBuffer());
            if (fs_1.default.existsSync(tempPath))
                fs_1.default.unlinkSync(tempPath);
        }
        catch (bgError) {
            console.warn("[BG Removal] Ошибка при обработке файла:", bgError);
            if (fs_1.default.existsSync(tempPath))
                fs_1.default.unlinkSync(tempPath);
        }
        const pixelatedBuffer = await (0, sharp_1.default)(resultBuffer)
            .resize(128, 128, { kernel: sharp_1.default.kernel.nearest })
            .resize(512, 512, { kernel: sharp_1.default.kernel.nearest })
            .png()
            .toBuffer();
        const finalPath = path_1.default.resolve(`${publicDir}${fileName}.png`);
        fs_1.default.writeFileSync(finalPath, pixelatedBuffer);
        return relativeUrl;
    }
    catch (error) {
        console.error("[processPlayerImage] Критическая ошибка при обработке:", error);
        return isUrl ? promptOrUrl : "";
    }
}
function generateImagePrompt(player) {
    return `
    Pixel art 16-bit SNES football player headshot,
    ${player.name} ${player.surname},
    ${player.nationality} national kit,
    full frontal view, looking at camera,
    white background, sharp pixels, retro game
  `
        .replace(/\s+/g, " ")
        .trim();
}
function generateImageUrlFromPrompt(prompt) {
    const seed = Math.floor(Math.random() * 1000000);
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${seed}`;
}
const FACES = [
    "face_1",
    "face_2",
    "face_3",
    "face_4",
    "face_5",
    "face_6",
    "face_7",
    "face_8",
    "face_9",
    "face_10",
    "face_11",
];
const HAIR_STYLES = ["short", "long", "bald", "mohawk", "curly"];
const HAIR_COLORS = ["black", "brown", "blonde", "red", "gray"];
const SKIN_COLORS = ["light", "tan", "dark", "pale"];
const BEARD_STYLES = ["none", "stubble", "full", "goatee"];
const EMOTIONS = ["neutral", "serious", "happy", "angry"];
const RARITIES = ["common", "rare", "epic", "legendary", "gold"];
const POSITIONS_BY_ROLE = {
    GOALKEEPER: [client_1.Position.GK],
    DEFENDER: [client_1.Position.CB, client_1.Position.LB, client_1.Position.RB],
    MIDFIELDER: [client_1.Position.CDM, client_1.Position.CM, client_1.Position.CAM],
    FORWARD: [client_1.Position.LW, client_1.Position.RW, client_1.Position.ST, client_1.Position.CF],
};
const STYLES_BY_ROLE = {
    GOALKEEPER: [
        client_1.PlayerStyle.POSITIONAL,
        client_1.PlayerStyle.DEFENSIVE,
        client_1.PlayerStyle.ATTACKING,
    ],
    DEFENDER: [
        client_1.PlayerStyle.POWERFUL,
        client_1.PlayerStyle.SPEEDY,
        client_1.PlayerStyle.POSITIONAL,
        client_1.PlayerStyle.DEFENSIVE,
    ],
    MIDFIELDER: [
        client_1.PlayerStyle.TECHNICAL,
        client_1.PlayerStyle.ATTACKING,
        client_1.PlayerStyle.DEFENSIVE,
        client_1.PlayerStyle.POSITIONAL,
    ],
    FORWARD: [
        client_1.PlayerStyle.SPEEDY,
        client_1.PlayerStyle.POWERFUL,
        client_1.PlayerStyle.TECHNICAL,
        client_1.PlayerStyle.ATTACKING,
    ],
};
function randomInt(rng, min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
}
function pickRandom(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
}
function generateName(rng) {
    const name = pickRandom(rng, constants_1.PLAYER_FIRST_NAMES);
    const surname = pickRandom(rng, constants_1.PLAYER_LAST_NAMES);
    return { name, surname };
}
function generateStatsForRole(rng, role, style, overallRating) {
    const base = Math.max(30, overallRating - 15);
    const high = Math.min(99, overallRating + 10);
    const stat = () => randomInt(rng, base, high);
    const stats = {
        pace: stat(),
        shooting: stat(),
        passing: stat(),
        dribbling: stat(),
        defending: stat(),
        physical: stat(),
        goalkeeping: role === "GOALKEEPER"
            ? randomInt(rng, overallRating - 5, Math.min(99, overallRating + 10))
            : randomInt(rng, 5, 20),
    };
    switch (style) {
        case "SPEEDY":
            stats.pace = Math.min(99, stats.pace + 10);
            break;
        case "POWERFUL":
            stats.physical = Math.min(99, stats.physical + 10);
            break;
        case "TECHNICAL":
            stats.dribbling = Math.min(99, stats.dribbling + 8);
            stats.passing = Math.min(99, stats.passing + 5);
            break;
        case "ATTACKING":
            stats.shooting = Math.min(99, stats.shooting + 8);
            break;
        case "DEFENSIVE":
            stats.defending = Math.min(99, stats.defending + 10);
            break;
        case "POSITIONAL":
            stats.passing = Math.min(99, stats.passing + 5);
            stats.defending = Math.min(99, stats.defending + 5);
            break;
    }
    switch (role) {
        case "GOALKEEPER":
            stats.defending = Math.min(99, stats.defending + 5);
            stats.shooting = Math.max(10, stats.shooting - 20);
            stats.dribbling = Math.max(10, stats.dribbling - 15);
            break;
        case "DEFENDER":
            stats.defending = Math.min(99, stats.defending + 8);
            stats.shooting = Math.max(20, stats.shooting - 10);
            break;
        case "MIDFIELDER":
            stats.passing = Math.min(99, stats.passing + 5);
            break;
        case "FORWARD":
            stats.shooting = Math.min(99, stats.shooting + 8);
            stats.defending = Math.max(20, stats.defending - 10);
            break;
    }
    return stats;
}
function mapAppearanceFromNationality(rng, nationality) {
    let skinColor = pickRandom(rng, SKIN_COLORS);
    let hairColor = pickRandom(rng, HAIR_COLORS);
    const european = [
        "FR",
        "DE",
        "GB",
        "ES",
        "IT",
        "NL",
        "PT",
        "BE",
        "HR",
        "NO",
        "DK",
        "SE",
        "CH",
        "AT",
        "PL",
        "UA",
        "RU",
        "BY",
    ];
    const southAmerican = ["BR", "AR", "UY", "CO", "CL", "EC"];
    const african = ["SN", "EG", "MA", "NG", "DZ", "CM", "CI", "GH"];
    const asian = ["JP", "KR", "SA", "IR", "AU", "UZ", "CN"];
    if (european.includes(nationality)) {
        skinColor = rng() > 0.8 ? "tan" : "light";
        hairColor = pickRandom(rng, ["brown", "black", "blonde", "gray"]);
    }
    else if (african.includes(nationality)) {
        skinColor = "dark";
        hairColor = "black";
    }
    else if (southAmerican.includes(nationality)) {
        skinColor = rng() > 0.5 ? "tan" : "light";
        hairColor = pickRandom(rng, ["black", "brown"]);
    }
    else if (asian.includes(nationality)) {
        skinColor = "light";
        hairColor = "black";
    }
    return {
        skinColor,
        hairColor,
        face: pickRandom(rng, FACES),
        hairStyle: pickRandom(rng, HAIR_STYLES),
        beardStyle: rng() > 0.7 ? pickRandom(rng, BEARD_STYLES) : "none",
        beardColor: hairColor,
        emotion: pickRandom(rng, EMOTIONS),
    };
}
async function generatePlayer(options = {}) {
    const rng = (0, seedrandom_1.default)(options.seed || Math.random().toString());
    const leagueLevel = randomInt(rng, 1, 70);
    const leagueDivisionId = leagueLevel > 35 ? 2 : 1;
    const leagueId = leagueLevel > 35 ? leagueLevel - 35 : leagueLevel;
    const leagueBaseOVR = Math.max(40, 95 - leagueLevel);
    const overallRating = randomInt(rng, leagueBaseOVR - 5, Math.min(99, leagueBaseOVR + 5));
    const role = options.role ?? pickRandom(rng, Object.values(client_1.PlayerRole));
    const position = options.position ?? pickRandom(rng, POSITIONS_BY_ROLE[role]);
    const style = pickRandom(rng, STYLES_BY_ROLE[role]);
    const stats = generateStatsForRole(rng, role, style, overallRating);
    const potentialMin = randomInt(rng, overallRating + 2, Math.min(99, overallRating + 10));
    const potentialMax = randomInt(rng, potentialMin + 5, Math.min(99, potentialMin + 15));
    const formValue = 1.0 + randomInt(rng, -10, 20) / 100;
    const age = randomInt(rng, 17, 34);
    const nationality = pickRandom(rng, constants_1.PLAYER_NATIONALITIES);
    const clubIndex = Math.floor(rng() * constants_1.PLAYER_CLUBS.length);
    const club = constants_1.PLAYER_CLUBS[clubIndex];
    const clubId = clubIndex + 1; // 1-indexed for emblems
    const heightCm = randomInt(rng, 165, 205);
    const weightKg = randomInt(rng, 60, 95);
    const foot = rng() > 0.7 ? "Left" : "Right";
    const skillMoves = randomInt(rng, 1, 5);
    const weakFoot = randomInt(rng, 1, 5);
    const country = nationality || "RU";
    const appearance = mapAppearanceFromNationality(rng, nationality);
    const rarity = overallRating >= 75 ? "gold" : overallRating >= 65 ? "silver" : "bronze";
    const { name, surname } = generateName(rng);
    const playerData = {
        name,
        surname,
        overallRating,
        position,
        role,
        style,
        potentialMin,
        potentialMax,
        heightCm,
        weightKg,
        foot,
        skillMoves,
        weakFoot,
        country,
        formValue,
        age,
        nationality,
        club,
        clubId,
        leagueId,
        leagueDivisionId,
        trainingLevel: 1,
        trainingLevelMax: 25,
        trainingExperience: 0,
        trainingExperienceRequired: 200,
        ...appearance,
        rarity,
        ...stats,
        paceBonus: 0,
        shootingBonus: 0,
        passingBonus: 0,
        dribblingBonus: 0,
        defendingBonus: 0,
        physicalBonus: 0,
    };
    // const fileName = `${name}_${surname}_${Date.now()}`.toLowerCase();
    // const prompt = generateImagePrompt(playerData);
    // const useLocal = !!LOCAL_AI_URL;
    // const finalImageUrl = await processPlayerImage(
    //   useLocal ? prompt : generateImageUrlFromPrompt(prompt),
    //   fileName,
    //   !useLocal,
    // );
    return {
        ...playerData,
        imageUrl: "ф.png",
    };
}
async function generateMultiplePlayers(count, options = {}) {
    const players = [];
    for (let i = 0; i < count; i++) {
        const player = await generatePlayer({
            ...options,
            seed: (options.seed || "gen") + `-${i}-${Date.now()}`,
        });
        players.push(player);
    }
    console.log("sadsad", players);
    return players;
}
