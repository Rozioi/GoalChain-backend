import fs from "fs";
import seedrandom from "seedrandom";
import path from "path";

// 1-indexed, aligned with PLAYER_CLUBS order in constants.ts
const CLUB_SHORT_BY_ID: Record<number, string> = {
    1: "che",   // Chelsea
    2: "mci",   // Manchester City
    3: "rma",   // Real Madrid
    4: "bar",   // Barcelona
    5: "fcb",   // Bayern Munich
    6: "arc",   // Arsenal
    7: "int",   // Inter Milan
    8: "mun",   // Manchester United
    9: "psg",   // PSG
    10: "liv",  // Liverpool
    11: "bcb",  // Borussia Dortmund
    12: "asm",  // Monaco
    13: "juv",  // Juventus
    14: "acm",  // AC Milan
};

const ETHNICITY_MAP: Record<string, string[]> = {
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

export function getEthnicityKey(nationality: string): string {
    for (const [key, countries] of Object.entries(ETHNICITY_MAP)) {
        if (countries.includes(nationality)) return key;
    }
    return "eur";
}

function getAvatarSubPath(clubId: number, nationality: string, variant: number): string {
    const clubCode = CLUB_SHORT_BY_ID[clubId] || "rma";
    const ethCode = getEthnicityKey(nationality);
    const number = String(variant).padStart(2, "0");
    return `${clubCode}/${ethCode}/${clubCode}_${ethCode}_${number}.png`;
}

export function getGeneratedPlayerAvatarFile(
    clubId: number,
    nationality: string,
    variant: number,
): string {
    return path.resolve(`./assets/cards/${getAvatarSubPath(clubId, nationality, variant)}`);
}

export function getGeneratedPlayerAvatarUrl(
    clubId: number,
    nationality: string,
    rng: () => number,
): string {
    return pickGeneratedPlayerAvatarUrl(clubId, nationality, rng);
}

/** Выбирает URL аватара, для которого реально есть локальный файл */
export function pickGeneratedPlayerAvatarUrl(
    clubId: number,
    nationality: string,
    rng: () => number,
): string {
    const startVariant = Math.floor(rng() * 4) + 1;

    for (let offset = 0; offset < 4; offset += 1) {
        const variant = ((startVariant - 1 + offset) % 4) + 1;
        const filePath = getGeneratedPlayerAvatarFile(
            clubId,
            nationality,
            variant,
        );
        if (fs.existsSync(filePath)) {
            return `/cards/${getAvatarSubPath(clubId, nationality, variant)}`;
        }
    }

    const ethCode = getEthnicityKey(nationality);
    const fallbackClub = CLUB_SHORT_BY_ID[3] || "rma";
    const fallbackPath = path.join(
        process.cwd(),
        "assets/cards",
        fallbackClub,
        ethCode,
    );
    if (fs.existsSync(fallbackPath)) {
        const anyPng = fs
            .readdirSync(fallbackPath)
            .find((file) => file.toLowerCase().endsWith(".png"));
        if (anyPng) {
            return `/cards/${fallbackClub}/${ethCode}/${anyPng}`;
        }
    }

    return `/cards/rma/eur/rma_eur_01.png`;
}

export function getGeneratedPlayerAvatarUrlFromSeed(
    clubId: number,
    nationality: string,
    seed: string,
): string {
    const rng = seedrandom(seed);
    const variant = Math.floor(rng() * 4) + 1;
    return `/cards/${getAvatarSubPath(clubId, nationality, variant)}`;
}

/** Разрешает локальный путь к аватару по URL вида /cards/... с fallback по вариантам */
export function resolveLocalCardAvatarPath(face?: string): string | null {
    if (!face?.startsWith("/cards/")) return null;

    const exactPath = path.join(process.cwd(), "assets", face);
    if (fs.existsSync(exactPath)) return exactPath;

    const match = face.match(/^\/cards\/([^/]+)\/([^/]+)\/([^/]+)\.png$/);
    if (!match) {
        console.warn(`[avatar] Invalid cards face URL: ${face}`);
        return null;
    }

    const [, clubCode, ethCode] = match;
    const dir = path.join(process.cwd(), "assets/cards", clubCode, ethCode);
    if (!fs.existsSync(dir)) {
        console.warn(`[avatar] Cards directory not found: ${dir}`);
        return null;
    }

    for (let variant = 1; variant <= 4; variant += 1) {
        const candidate = path.join(
            dir,
            `${clubCode}_${ethCode}_${String(variant).padStart(2, "0")}.png`,
        );
        if (fs.existsSync(candidate)) {
            console.warn(
                `[avatar] Exact file missing (${face}), using fallback ${path.basename(candidate)}`,
            );
            return candidate;
        }
    }

    const anyPng = fs
        .readdirSync(dir)
        .find((file) => file.toLowerCase().endsWith(".png"));
    if (anyPng) {
        console.warn(
            `[avatar] Using first available png in ${dir}: ${anyPng}`,
        );
        return path.join(dir, anyPng);
    }

    console.warn(`[avatar] No png files found in ${dir}`);
    return null;
}

export function getDefaultAvatarFallbackPath(): string {
    return path.resolve("./assets/player.png");
}
