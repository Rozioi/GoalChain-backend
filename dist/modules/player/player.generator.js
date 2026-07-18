"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePlayer = generatePlayer;
exports.generateMultiplePlayers = generateMultiplePlayers;
const seedrandom_1 = __importDefault(require("seedrandom"));
const client_1 = require("@prisma/client");
const constants_1 = require("../../config/constants");
const player_avatar_1 = require("./player.avatar");
function generateImagePrompt(player) {
    return "";
}
function generateImageUrlFromPrompt(prompt) {
    return "";
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
    const leagueLevel = options.ovrMin !== undefined && options.ovrMax !== undefined
        ? 0
        : randomInt(rng, 1, 70);
    const leagueDivisionId = leagueLevel > 35 ? 2 : 1;
    const leagueId = leagueLevel > 35 ? leagueLevel - 35 : leagueLevel;
    let overallRating;
    if (options.ovrMin !== undefined && options.ovrMax !== undefined) {
        overallRating = randomInt(rng, options.ovrMin, options.ovrMax);
    }
    else {
        const leagueBaseOVR = Math.max(40, 95 - leagueLevel);
        overallRating = randomInt(rng, leagueBaseOVR - 5, Math.min(99, leagueBaseOVR + 5));
    }
    const role = options.role ??
        pickRandom(rng, Object.values(client_1.PlayerRole));
    const position = options.position ?? pickRandom(rng, POSITIONS_BY_ROLE[role]);
    const style = pickRandom(rng, STYLES_BY_ROLE[role]);
    const stats = generateStatsForRole(rng, role, style, overallRating);
    // Потенциал: от текущего OVR до макс. возможного
    // potentialMin — нижняя граница (сейчас = OVR)
    // potentialMax — максимальный OVR, до которого может прокачаться игрок
    const potentialMax = randomInt(rng, Math.max(overallRating + 5, 60), Math.min(99, overallRating + 20));
    const potentialMin = overallRating; // текущий OVR = нижняя граница
    const formValue = 1.0 + randomInt(rng, -10, 20) / 100;
    const age = randomInt(rng, 17, 34);
    const nationality = pickRandom(rng, constants_1.PLAYER_NATIONALITIES);
    const clubIndex = Math.floor(rng() * constants_1.PLAYER_CLUBS.length);
    const club = constants_1.PLAYER_CLUBS[clubIndex];
    const clubId = clubIndex + 1; // 1-indexed for emblems
    const heightCm = randomInt(rng, 165, 205);
    const weightKg = randomInt(rng, 60, 95);
    const foot = rng() > 0.7 ? "Left" : "Right";
    // Skill Moves logic based on position and OVR
    const isDefenderOrGK = role === client_1.PlayerRole.GOALKEEPER ||
        role === client_1.PlayerRole.DEFENDER ||
        position === client_1.Position.CB ||
        position === client_1.Position.LB ||
        position === client_1.Position.RB;
    let skillMoves;
    if (isDefenderOrGK) {
        skillMoves = randomInt(rng, 1, 2); // 1 or 2 stars
    }
    else {
        // Forwards, Midfielders, etc.
        if (overallRating >= 85) {
            skillMoves = randomInt(rng, 4, 5); // 4 or 5 stars
        }
        else if (overallRating >= 75) {
            skillMoves = randomInt(rng, 3, 4); // 3 or 4 stars
        }
        else if (overallRating >= 60) {
            skillMoves = 3; // 3 stars
        }
        else {
            skillMoves = 2; // 2 stars
        }
    }
    const weakFoot = randomInt(rng, 1, 5);
    const country = nationality || "RU";
    const appearance = mapAppearanceFromNationality(rng, nationality);
    const rarity = overallRating >= 75
        ? "gold"
        : overallRating >= 65
            ? "silver"
            : "bronze";
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
    // IPFS avatar URL for generated players
    const face = (0, player_avatar_1.getGeneratedPlayerAvatarUrl)(clubId, nationality, rng);
    let imageUrl = "";
    try {
        const avatarBuffer = await (0, player_avatar_1.loadAvatarBufferWithFallback)(face);
        const { assembleCardFromPlayerBuffer } = await Promise.resolve().then(() => __importStar(require("./playerImage.together")));
        const cardData = {
            name,
            surname,
            nationality,
            club,
            clubId,
            overallRating,
            position,
            pace: playerData.pace,
            shooting: playerData.shooting,
            passing: playerData.passing,
            dribbling: playerData.dribbling,
            defending: playerData.defending,
            physical: playerData.physical,
        };
        const fileName = `${name}_${surname}`.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
        imageUrl = await assembleCardFromPlayerBuffer(avatarBuffer, cardData, rarity, fileName) || "";
    }
    catch (err) {
        console.error("Failed to generate player card:", err);
    }
    return {
        ...playerData,
        face,
        imageUrl,
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
    return players;
}
