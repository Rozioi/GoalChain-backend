"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAYER_CLUBS = exports.PLAYER_NATIONALITIES = exports.PLAYER_LAST_NAMES = exports.PLAYER_FIRST_NAMES = exports.REFERRAL = exports.SEASON = exports.SCOUTING = exports.TRAINING = exports.MATCH = exports.DRAFT = void 0;
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
// ─── MATCH ──────────────────────────────────────────────────────
exports.MATCH = {
    MATCHMAKING_RATING_RANGE: 0.1, // ±10% rating
    MATCHMAKING_TIMEOUT_MS: 30000,
    DAILY_FRIENDLY_LIMIT: 10,
    MATCH_ITERATIONS: 90, // 90 min simulation
    OVERTIME_ITERATIONS: 10, // ~1 min extra time
    REWARDS: {
        WIN_COINS: 100,
        DRAW_COINS: 50,
        LOSS_COINS: 20,
        WIN_EXP: 30,
        DRAW_EXP: 15,
        LOSS_EXP: 10,
        DIMINISHING_FACTOR: 0.85, // reward multiplier per repeated match
    },
};
// ─── TRAINING ───────────────────────────────────────────────────
exports.TRAINING = {
    BASE_COST: 100,
    COST_MULTIPLIER: 1.5, // cost increases per training
    COOLDOWN_MS: 2 * 60 * 60 * 1000, // 2 hours
    BOOST_NORMAL: 1,
    BOOST_NFT: 2,
    MAX_OVR_NORMAL: 85,
    MAX_OVR_NFT: 99,
};
// ─── SCOUTING ───────────────────────────────────────────────────
exports.SCOUTING = {
    MAX_ACTIVE_SCOUTS: 3,
    DURATION_MS: 4 * 60 * 60 * 1000, // 4 hours
    NFT_CHANCE: 0.1, // 10%
    COST: 200,
    REGIONS: [
        "Europe",
        "South America",
        "Africa",
        "Asia",
        "North America",
        "Oceania",
    ],
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
// ─── PLAYER NAMES ───────────────────────────────────────────────
exports.PLAYER_FIRST_NAMES = [
    "Marco", "Luis", "Kevin", "Paul", "Sergio", "Luka",
    "Neymar", "Kylian", "Mohamed", "Sadio", "Leroy",
    "Toni", "Antoine", "Pierre", "Raheem", "Harry",
    "Bruno", "Jadon", "Phil", "Romelu", "Karim",
    "Edinson", "Gerard", "Ivan", "Mateo", "Casemiro",
    "Federico", "Lorenzo", "Nicolo", "Dusan", "Erling",
    "Jude", "Florian", "Ousmane", "Victor", "Darwin",
    "Julian", "Pedri", "Gavi", "Bukayo", "Vinicius",
];
exports.PLAYER_LAST_NAMES = [
    "Silva", "Fernandez", "Martinez", "Garcia", "Rodriguez",
    "Mueller", "Kroos", "Werner", "Havertz", "Sancho",
    "Haaland", "Mbappe", "Griezmann", "Dembele", "Kante",
    "Salah", "Mane", "Firmino", "Alisson", "Fabinho",
    "De Bruyne", "Sterling", "Foden", "Walker", "Stones",
    "Bellingham", "Saka", "Rice", "Palmer", "Watkins",
    "Osimhen", "Nunez", "Diaz", "Valverde", "Modric",
    "Barella", "Chiesa", "Vlahovic", "Insigne", "Verratti",
];
exports.PLAYER_NATIONALITIES = [
    "Brazil", "Argentina", "France", "Germany", "England",
    "Spain", "Italy", "Netherlands", "Portugal", "Belgium",
    "Croatia", "Senegal", "Egypt", "Norway", "Uruguay",
];
exports.PLAYER_CLUBS = [
    "London Lions", "Paris Pride", "Madrid Kings", "Munich Stars",
    "Milan Giants", "Manchester United", "Barcelona FC", "Liverpool Red",
    "Inter Milan", "Bayern Munich", "Ajax Amsterdan", "Porto Dragoes",
    "Dortmund Yellow", "Juventus Old", "Atletico Madrid",
];
