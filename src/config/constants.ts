// ─── DRAFT ──────────────────────────────────────────────────────
export const DRAFT = {
    STARTER_GK_OPTIONS: 4,
    STARTER_DEF_OPTIONS: 7,
    STARTER_MID_OPTIONS: 7,
    STARTER_FWD_OPTIONS: 5,

    STARTER_GK_PICKS: 1,
    STARTER_DEF_PICKS: 4,
    STARTER_MID_PICKS: 4,
    STARTER_FWD_PICKS: 2,

    RESERVE_GK: 1,
    RESERVE_DEF: 4,
    RESERVE_MID: 4,
    RESERVE_FWD: 5,

    STARTER_OVR_MIN: 50,
    STARTER_OVR_MAX: 70,
    RESERVE_OVR_MIN: 40,
    RESERVE_OVR_MAX: 48,
};

// ─── ENERGY ─────────────────────────────────────────────────────
export const ENERGY = {
    MAX: 10,
    REGEN_INTERVAL_MS: 2 * 60 * 60 * 1000, // 1 unit every 2 hours
};

// ─── RANK DIVISIONS ─────────────────────────────────────────────
export const DIVISION_TIERS = [
    { name: "Bronze", min: 0, max: 1499, lossPenalty: 5 },
    { name: "Silver", min: 1500, max: 2999, lossPenalty: 15 },
    { name: "Gold", min: 3000, max: 4499, lossPenalty: 22 },
    { name: "Diamond", min: 4500, max: 5999, lossPenalty: 28 },
    { name: "Master", min: 6000, max: Infinity, lossPenalty: 30 },
] as const;

export const MATCH = {
    MATCHMAKING_RATING_RANGE: 0.1,
    MATCHMAKING_POINTS_RANGE: 300,
    MATCHMAKING_TIMEOUT_MS: 30_000,
    DAILY_FRIENDLY_LIMIT: 10,
    MATCH_ITERATIONS: 90,
    OVERTIME_ITERATIONS: 10,
    LIVE_MS_PER_MINUTE: 500,

    REWARDS: {
        WIN_COINS: 500,
        DRAW_COINS: 100,
        LOSS_COINS: 50,
        WIN_EXP: 30,
        DRAW_EXP: 15,
        LOSS_EXP: 10,
        DIMINISHING_FACTOR: 0.85,
    },
};

export const INVITE = {
    FRIEND_TTL_MS: 15 * 60 * 1000,
    OPEN_TTL_MS: 60 * 60 * 1000,
    EXPIRY_CHECK_INTERVAL_MS: 60_000,
};

// ─── TRAINING ───────────────────────────────────────────────────
export const TRAINING = {
    BASE_COST: 100, // начальная стоимость
    COST_MULTIPLIER: 1.3, // каждая тренировка дорожает на 30%
    COOLDOWN_MS: 1 * 60 * 60 * 1000, // 1 час кулдаун
    BOOST: 1, // +1 к выбранной стате
    OVR_BOOST: 0.5, // +0.5 к общему OVR (округляется)
    MAX_OVR: 99, // глобальный максимум
    XP_PER_TRAINING: 25, // XP за тренировку
    XP_PER_LEVEL: 100, // XP для нового уровня тр.
    MAX_TRAINING_LEVEL: 25, // макс. уровень тренировки
};

// ─── NFT ────────────────────────────────────────────────────────
export const NFT = {
    MAX_OVR: 99,
    MIN_OVR_FOR_MINT: 75,
    MIN_MATCHES_FOR_MINT: 100,
    COLLECTION_ADDRESS: process.env.TON_COLLECTION_ADDRESS || "",
    MINT_LOCK_DURATION_MS: 10 * 60 * 1000, // 10 minutes lock
};

export const SCOUTING = {
    MAX_ACTIVE_SCOUTS: 3,
    // Default scouting duration: 1 hour
    DURATION_MS: 1,
    REGIONS: [
        "Europe",
        "South America",
        "Africa",
        "Asia",
        "North America",
        "Oceania",
    ],
    TIERS: {
        COMMON: {
            COST: 1000,
            CURRENCY: "COIN",
            OVR_RANGE: [45, 70],
            CHANCE: { min: 35, max: 50 }, // 35-50% chance to find a player
        },
        PRO: {
            COST: 5000,
            CURRENCY: "COIN",
            OVR_RANGE: [65, 82],
            CHANCE: { min: 55, max: 70 }, // 55-70% chance to find a player
        },
        MASTER: {
            COST: 1, // 1 TON
            CURRENCY: "TON",
            OVR_RANGE: [75, 95],
            CHANCE: { min: 85, max: 95 }, // 85-95% chance to find a player
        },
    },
};

// ─── SEASONS ────────────────────────────────────────────────────
export const SEASON = {
    DURATION_WEEKS: 3,
    DIVISIONS: 5,
    PROMOTION_SLOTS: 3,
    RELEGATION_SLOTS: 3,
    REWARDS: {
        FIRST_PLACE: 5000,
        SECOND_PLACE: 3000,
        THIRD_PLACE: 1500,
    },
};

// ─── REFERRALS ──────────────────────────────────────────────────
export const REFERRAL = {
    INVITER_REWARD: 500,
    INVITEE_REWARD: 300,
};

// ─── RENT ───────────────────────────────────────────────────────
export const RENT = {
    COMMISSION_RATE: 0.1, // 10% platform fee
};

// ─── PLAYER NAMES ───────────────────────────────────────────────
export const PLAYER_FIRST_NAMES = [
    "Ivan",
    "Vladimir",
    "Andrey",
    "Roman",
    "Pedro",
    "Marco",
    "Luis",
    "Kevin",
    "Paul",
    "Sergio",
    "Luka",
    "Neymar",
    "Kylian",
    "Mohamed",
    "Sadio",
    "Leroy",
    "Toni",
    "Antoine",
    "Pierre",
    "Raheem",
    "Harry",
    "Bruno",
    "Jadon",
    "Phil",
    "Romelu",
    "Karim",
    "Edinson",
    "Gerard",
    "Ivan",
    "Mateo",
    "Casemiro",
    "Federico",
    "Lorenzo",
    "Nicolo",
    "Dusan",
    "Erling",
    "Jude",
    "Florian",
    "Ousmane",
    "Victor",
    "Darwin",
    "Julian",
    "Pedri",
    "Gavi",
    "Bukayo",
    "Vinicius",
    "Lionel",
    "Cristiano",
    "Robert",
    "Zlatan",
    "Thibaut",
    "Alphonso",
    "Kingsley",
    "Achraf",
    "Son",
    "Heung-min",
    "Declan",
    "Rodri",
    "Bernardo",
    "Lautaro",
    "Alexis",
    "Bukayo",
    "Khvicha",
    "Rafael",
    "Jamal",
    "Endrick",
    "Lamine",
    "Kobbie",
    "Xavi",
    "Arda",
];

export const PLAYER_LAST_NAMES = [
    "Mirol",
    "Melnik",
    "Zhalezny",
    "Romanovsky",
    "Silva",
    "Fernandez",
    "Martinez",
    "Garcia",
    "Rodriguez",
    "Mueller",
    "Kroos",
    "Werner",
    "Havertz",
    "Sancho",
    "Haaland",
    "Mbappe",
    "Griezmann",
    "Dembele",
    "Kante",
    "Salah",
    "Mane",
    "Firmino",
    "Alisson",
    "Fabinho",
    "De Bruyne",
    "Sterling",
    "Foden",
    "Walker",
    "Stones",
    "Bellingham",
    "Saka",
    "Rice",
    "Palmer",
    "Watkins",
    "Osimhen",
    "Nunez",
    "Diaz",
    "Valverde",
    "Modric",
    "Barella",
    "Chiesa",
    "Vlahovic",
    "Insigne",
    "Verratti",
    "Messi",
    "Ronaldo",
    "Lewandowski",
    "Ibrahimovic",
    "Courtois",
    "Davies",
    "Coman",
    "Hakimi",
    "Yamal",
    "Guler",
    "Mainoo",
    "Leao",
    "Musiala",
    "Kvaratskhelia",
    "Alvarez",
    "Lautaro",
    "Bastoni",
    "Hernandez",
    "Upamecano",
    "Saliba",
    "Van Dijk",
    "Alexander-Arnold",
    "Robertson",
    "Lapkouski",
];
export const PLAYER_NATIONALITIES = [
    // Европа (UEFA)
    "FR", // France
    "DE", // Germany
    "GB", // England
    "ES", // Spain
    "IT", // Italy
    "NL", // Netherlands
    "PT", // Portugal
    "BE", // Belgium
    "HR", // Croatia
    "NO", // Norway
    "DK", // Denmark
    "SE", // Sweden
    "CH", // Switzerland
    "AT", // Austria
    "PL", // Poland
    "UA", // Ukraine
    "TR", // Turkey
    "GR", // Greece
    "IE", // Ireland
    "CZ", // Czech Republic
    "SK", // Slovakia
    "HU", // Hungary
    "RS", // Serbia
    "SI", // Slovenia
    "GE", // Georgia
    "BY", // Belarus
    "LT", // Lithuania
    "LV", //
    "EE", // Estonia
    "FI", // Finland

    // Южная Америка (CONMEBOL)
    "BR", // Brazil
    "AR", // Argentina
    "UY", // Uruguay
    "CO", // Colombia
    "CL", // Chile
    "EC", // Ecuador
    "PY", // Paraguay
    "PE", // Peru
    "BO", // Bolivia
    "VE", // Venezuela

    // Африка (CAF)
    "SN", // Senegal
    "EG", // Egypt
    "MA", // Morocco
    "NG", // Nigeria
    "DZ", // Algeria
    "CM", // Cameroon
    "CI", // Ivory Coast
    "GH", // Ghana
    "TN", // Tunisia
    "ML", // Mali

    // Азия (AFC)
    "JP", // Japan
    "KR", // South Korea
    "SA", // Saudi Arabia
    "IR", // Iran
    "AU", // Australia
    "AE", // UAE
    "QA", // Qatar
    "UZ", // Uzbekistan
    "CN", // China

    // Северная Америка (CONCACAF)
    "US", // USA
    "MX", // Mexico
    "CA", // Canada
    "CR", // Costa Rica
    "JM", // Jamaica
    "PA", // Panama
] as const;

export type NationalityCode = (typeof PLAYER_NATIONALITIES)[number];

export const PLAYER_CLUBS = [
    "Real Madrid",
    "Manchester City",
    "Liverpool FC",
    "FC Barcelona",
    "Bayern Munich",
    "Paris Saint-Germain",
    "Inter Milan",
    "Arsenal FC",
    "Bayer Leverkusen",
    "AC Milan",
    "Borussia Dortmund",
    "Atletico Madrid",
    "Juventus",
    "Chelsea FC",
    "Tottenham Hotspur",
    "Benfica",
    "Napoli",
    "Ajax",
    "Sporting CP",
    "Aston Villa",
];
