"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAYER_CLUBS = exports.PLAYER_NATIONALITIES = exports.PLAYER_LAST_NAMES = exports.PLAYER_FIRST_NAMES = exports.RENT = exports.REFERRAL = exports.SEASON = exports.SCOUTING = exports.TRAINING = exports.INVITE = exports.MATCH = exports.ENERGY = exports.DRAFT = void 0;
// ─── DRAFT ──────────────────────────────────────────────────────
exports.DRAFT = {
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
    STARTER_OVR_MIN: 55,
    STARTER_OVR_MAX: 75,
    RESERVE_OVR_MIN: 40,
    RESERVE_OVR_MAX: 50,
};
// ─── ENERGY ─────────────────────────────────────────────────────
exports.ENERGY = {
    MAX: 10,
    REGEN_INTERVAL_MS: 2 * 60 * 60 * 1000, // 1 unit every 2 hours
};
// ─── MATCH ──────────────────────────────────────────────────────
exports.MATCH = {
    MATCHMAKING_RATING_RANGE: 0.1,
    MATCHMAKING_POINTS_RANGE: 300,
    MATCHMAKING_TIMEOUT_MS: 30000,
    DAILY_FRIENDLY_LIMIT: 10,
    MATCH_ITERATIONS: 90,
    OVERTIME_ITERATIONS: 10,
    LIVE_MS_PER_MINUTE: 500,
    REWARDS: {
        WIN_COINS: 100,
        DRAW_COINS: 50,
        LOSS_COINS: 20,
        WIN_EXP: 30,
        DRAW_EXP: 15,
        LOSS_EXP: 10,
        DIMINISHING_FACTOR: 0.85,
    },
};
exports.INVITE = {
    FRIEND_TTL_MS: 15 * 60 * 1000,
    OPEN_TTL_MS: 60 * 60 * 1000,
    EXPIRY_CHECK_INTERVAL_MS: 60000,
};
// ─── TRAINING ───────────────────────────────────────────────────
exports.TRAINING = {
    BASE_COST: 100,
    COST_MULTIPLIER: 1.5,
    COOLDOWN_MS: 2 * 60 * 60 * 1000,
    BOOST_NORMAL: 1,
    BOOST_NFT: 2,
    MAX_OVR_NORMAL: 120,
    MAX_OVR_NFT: 150,
};
exports.SCOUTING = {
    MAX_ACTIVE_SCOUTS: 3,
    // Default scouting duration: 1 hour
    DURATION_MS: 60,
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
            NFT_CHANCE: 0.05,
        },
        PRO: {
            COST: 5000,
            CURRENCY: "COIN",
            OVR_RANGE: [65, 82],
            NFT_CHANCE: 0.15,
        },
        MASTER: {
            COST: 1, // 1 TON
            CURRENCY: "TON",
            OVR_RANGE: [75, 95],
            NFT_CHANCE: 0.5,
        },
    },
};
// ─── SEASONS ────────────────────────────────────────────────────
exports.SEASON = {
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
exports.REFERRAL = {
    INVITER_REWARD: 500,
    INVITEE_REWARD: 300,
};
// ─── RENT ───────────────────────────────────────────────────────
exports.RENT = {
    COMMISSION_RATE: 0.1, // 10% platform fee
};
// ─── PLAYER NAMES ───────────────────────────────────────────────
exports.PLAYER_FIRST_NAMES = [
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
exports.PLAYER_LAST_NAMES = [
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
exports.PLAYER_NATIONALITIES = [
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
];
exports.PLAYER_CLUBS = [
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
