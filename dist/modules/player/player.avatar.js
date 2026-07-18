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
exports.IPFS_AVATAR_BASE = void 0;
exports.getEthnicityKey = getEthnicityKey;
exports.buildIpfsAvatarUrl = buildIpfsAvatarUrl;
exports.getGeneratedPlayerAvatarUrl = getGeneratedPlayerAvatarUrl;
exports.getGeneratedPlayerAvatarUrlFromSeed = getGeneratedPlayerAvatarUrlFromSeed;
exports.loadAvatarBuffer = loadAvatarBuffer;
exports.loadAvatarBufferWithFallback = loadAvatarBufferWithFallback;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const seedrandom_1 = __importDefault(require("seedrandom"));
exports.IPFS_AVATAR_BASE = "https://ipfs.io/ipfs/bafybeia7sdif45zbosyfju3l75q42su3e324vyhq747begn3kghrhce7pi";
const CLUB_SHORT_BY_ID = {
    1: "che",
    2: "mci",
    3: "rma",
    4: "fcb",
    5: "bcb",
    6: "arc",
    7: "int",
    8: "mun",
    9: "psg",
    10: "liv",
    11: "asm",
    12: "asm",
    13: "juv",
    14: "acm",
};
const ETHNICITY_MAP = {
    eur: [
        "FR", "DE", "GB", "ES", "IT", "NL", "PT", "BE", "HR", "NO", "DK", "SE",
        "CH", "AT", "PL", "UA", "RU", "BY", "TR", "GR", "IE", "CZ", "SK", "HU",
        "RS", "SI", "GE", "LT", "LV", "EE", "FI",
    ],
    afr: [
        "SN", "EG", "MA", "NG", "DZ", "CM", "CI", "GH", "ZA", "KE", "TN", "ML",
    ],
    lat: ["BR", "AR", "UY", "CO", "CL", "EC", "MX", "PE", "PY", "BO", "VE"],
    asi: ["JP", "KR", "SA", "IR", "AU", "UZ", "CN", "IN", "AE", "QA"],
    ara: ["AE", "QA", "SA", "OM", "KW", "BH", "JO", "LB"],
};
function getEthnicityKey(nationality) {
    for (const [key, countries] of Object.entries(ETHNICITY_MAP)) {
        if (countries.includes(nationality))
            return key;
    }
    return "eur";
}
function buildIpfsAvatarUrl(clubId, nationality, variant) {
    const clubCode = CLUB_SHORT_BY_ID[clubId] || "rma";
    const ethCode = getEthnicityKey(nationality);
    const number = String(variant).padStart(1, "0");
    return `${exports.IPFS_AVATAR_BASE}/${clubCode}/${ethCode}/${clubCode}_${ethCode}_0${number}.png`;
}
function getGeneratedPlayerAvatarUrl(clubId, nationality, rng) {
    const variant = Math.floor(rng() * 5);
    return buildIpfsAvatarUrl(clubId, nationality, variant);
}
function getGeneratedPlayerAvatarUrlFromSeed(clubId, nationality, seed) {
    const rng = (0, seedrandom_1.default)(seed);
    const variant = Math.floor(rng() * 5);
    return buildIpfsAvatarUrl(clubId, nationality, variant);
}
async function loadAvatarBuffer(facePath) {
    if (!facePath)
        return null;
    if (facePath.startsWith("http://") || facePath.startsWith("https://")) {
        try {
            const response = await fetch(facePath);
            if (!response.ok)
                return null;
            return Buffer.from(await response.arrayBuffer());
        }
        catch {
            return null;
        }
    }
    const localPath = facePath.startsWith("unreal/")
        ? path_1.default.resolve(`./assets/${facePath}`)
        : path_1.default.resolve(facePath);
    if (fs_1.default.existsSync(localPath)) {
        return fs_1.default.readFileSync(localPath);
    }
    return null;
}
async function loadAvatarBufferWithFallback(facePath) {
    const sharp = (await Promise.resolve().then(() => __importStar(require("sharp")))).default;
    const fromPath = await loadAvatarBuffer(facePath);
    if (fromPath)
        return fromPath;
    const fallbackPath = path_1.default.resolve("./assets/player.png");
    if (fs_1.default.existsSync(fallbackPath)) {
        return fs_1.default.readFileSync(fallbackPath);
    }
    return sharp({
        create: {
            width: 512,
            height: 512,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    })
        .png()
        .toBuffer();
}
