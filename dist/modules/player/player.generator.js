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
const POSITIONS_BY_ROLE = {
    GOALKEEPER: [client_1.Position.GK],
    DEFENDER: [client_1.Position.CB, client_1.Position.LB, client_1.Position.RB],
    MIDFIELDER: [client_1.Position.CDM, client_1.Position.CM, client_1.Position.CAM],
    FORWARD: [client_1.Position.LW, client_1.Position.RW, client_1.Position.ST, client_1.Position.CF],
};
const STYLES_BY_ROLE = {
    GOALKEEPER: [client_1.PlayerStyle.POSITIONAL, client_1.PlayerStyle.DEFENSIVE, client_1.PlayerStyle.ATTACKING],
    DEFENDER: [client_1.PlayerStyle.POWERFUL, client_1.PlayerStyle.SPEEDY, client_1.PlayerStyle.POSITIONAL, client_1.PlayerStyle.DEFENSIVE],
    MIDFIELDER: [client_1.PlayerStyle.TECHNICAL, client_1.PlayerStyle.ATTACKING, client_1.PlayerStyle.DEFENSIVE, client_1.PlayerStyle.POSITIONAL],
    FORWARD: [client_1.PlayerStyle.SPEEDY, client_1.PlayerStyle.POWERFUL, client_1.PlayerStyle.TECHNICAL, client_1.PlayerStyle.ATTACKING],
};
function randomInt(rng, min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
}
function pickRandom(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
}
function generateName(rng) {
    const first = pickRandom(rng, constants_1.PLAYER_FIRST_NAMES);
    const last = pickRandom(rng, constants_1.PLAYER_LAST_NAMES);
    return `${first} ${last}`;
}
function generateStatsForRole(rng, role, style, ovr) {
    const base = Math.max(30, ovr - 15);
    const high = Math.min(99, ovr + 10);
    const stat = () => randomInt(rng, base, high);
    const stats = {
        pace: stat(),
        shooting: stat(),
        passing: stat(),
        dribbling: stat(),
        defending: stat(),
        physical: stat(),
        goalkeeping: role === "GOALKEEPER" ? randomInt(rng, ovr - 5, Math.min(99, ovr + 10)) : randomInt(rng, 5, 20),
    };
    // Style bonuses
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
    // Role adjustments
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
function generatePlayer(options = {}) {
    const rng = (0, seedrandom_1.default)(options.seed || Math.random().toString());
    const ovrMin = options.ovrMin ?? constants_1.DRAFT.STARTER_OVR_MIN;
    const ovrMax = options.ovrMax ?? constants_1.DRAFT.STARTER_OVR_MAX;
    const ovr = randomInt(rng, ovrMin, ovrMax);
    const role = options.role ?? pickRandom(rng, Object.values(client_1.PlayerRole));
    const position = options.position ?? pickRandom(rng, POSITIONS_BY_ROLE[role]);
    const style = pickRandom(rng, STYLES_BY_ROLE[role]);
    const stats = generateStatsForRole(rng, role, style, ovr);
    const potential = randomInt(rng, ovr + 5, Math.min(99, ovr + 20));
    const form = randomInt(rng, 60, 100);
    const age = randomInt(rng, 17, 34);
    const nationality = pickRandom(rng, constants_1.PLAYER_NATIONALITIES);
    const club = pickRandom(rng, constants_1.PLAYER_CLUBS);
    return {
        name: generateName(rng),
        ovr,
        position,
        role,
        style,
        potential,
        form,
        age,
        nationality,
        club,
        ...stats,
    };
}
function generateMultiplePlayers(count, options = {}) {
    const players = [];
    for (let i = 0; i < count; i++) {
        players.push(generatePlayer({
            ...options,
            seed: (options.seed || "gen") + `-${i}-${Date.now()}`,
        }));
    }
    return players;
}
