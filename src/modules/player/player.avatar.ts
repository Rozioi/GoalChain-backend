import seedrandom from "seedrandom";

export const IPFS_AVATAR_CID =
    "bafybeia7sdif45zbosyfju3l75q42su3e324vyhq747begn3kghrhce7pi";

export const IPFS_AVATAR_BASE =
    "https://ipfs.io/ipfs/bafybeia7sdif45zbosyfju3l75q42su3e324vyhq747begn3kghrhce7pi";

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

export function buildIpfsAvatarUrl(
    clubId: number,
    nationality: string,
    variant: number,
): string {
    const clubCode = CLUB_SHORT_BY_ID[clubId] || "rma";
    const ethCode = getEthnicityKey(nationality);
    const number = String(variant).padStart(2, "0");
    return `${IPFS_AVATAR_BASE}/${clubCode}/${ethCode}/${clubCode}_${ethCode}_${number}.png`;
}

export function getGeneratedPlayerAvatarUrl(
    clubId: number,
    nationality: string,
    rng: () => number,
): string {
    // variant 1–4 for the 4 avatar options on IPFS
    const variant = Math.floor(rng() * 4) + 1;
    return buildIpfsAvatarUrl(clubId, nationality, variant);
}

export function getGeneratedPlayerAvatarUrlFromSeed(
    clubId: number,
    nationality: string,
    seed: string,
): string {
    const rng = seedrandom(seed);
    // variant 1–4 for the 4 avatar options on IPFS
    const variant = Math.floor(rng() * 4) + 1;
    return buildIpfsAvatarUrl(clubId, nationality, variant);
}
