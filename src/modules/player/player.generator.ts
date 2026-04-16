import seedrandom from "seedrandom";
import {
    Position,
    PlayerRole,
    PlayerStyle,
} from "@prisma/client";
import {
    PLAYER_FIRST_NAMES,
    PLAYER_LAST_NAMES,
    DRAFT,
    PLAYER_NATIONALITIES,
    PLAYER_CLUBS,
} from "../../config/constants";

interface GenerateOptions {
    position?: Position;
    role?: PlayerRole;
    ovrMin?: number;
    ovrMax?: number;
    seed?: string;
}

export interface GeneratedPlayer {
    name: string;
    surname: string;
    ovr: number;
    position: Position;
    role: PlayerRole;
    style: PlayerStyle;
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
    goalkeeping: number;
    potentialMin: number;
    potentialMax: number;
    height: number;
    weight: number;
    foot: string;
    skillMoves: number;
    weakFoot: number;
    country: string;
    form: number;
    age: number;
    nationality: string;
    club: string;
    clubId: number;
    trainingLevel: number;
    trainingLevelMax: number;
    trainingExperience: number;
    trainingExperienceRequired: number;
    face: string;
    hairStyle: string;
    hairColor: string;
    skinColor: string;
    beardStyle: string;
    beardColor: string;
    emotion: string;
    rarity: string;
}

const FACES = ["face_1", "face_2", "face_3", "face_4", "face_5", "face_6", "face_7", "face_8", "face_9", "face_10", "face_11"];
const HAIR_STYLES = ["short", "long", "bald", "mohawk", "curly"];
const HAIR_COLORS = ["black", "brown", "blonde", "red", "gray"];
const SKIN_COLORS = ["light", "tan", "dark", "pale"];
const BEARD_STYLES = ["none", "stubble", "full", "goatee"];
const EMOTIONS = ["neutral", "serious", "happy", "angry"];
const RARITIES = ["common", "rare", "epic", "legendary", "gold"];

const POSITIONS_BY_ROLE: Record<PlayerRole, Position[]> = {
    GOALKEEPER: [Position.GK],
    DEFENDER: [Position.CB, Position.LB, Position.RB],
    MIDFIELDER: [Position.CDM, Position.CM, Position.CAM],
    FORWARD: [Position.LW, Position.RW, Position.ST, Position.CF],
};

const STYLES_BY_ROLE: Record<PlayerRole, PlayerStyle[]> = {
    GOALKEEPER: [PlayerStyle.POSITIONAL, PlayerStyle.DEFENSIVE, PlayerStyle.ATTACKING],
    DEFENDER: [PlayerStyle.POWERFUL, PlayerStyle.SPEEDY, PlayerStyle.POSITIONAL, PlayerStyle.DEFENSIVE],
    MIDFIELDER: [PlayerStyle.TECHNICAL, PlayerStyle.ATTACKING, PlayerStyle.DEFENSIVE, PlayerStyle.POSITIONAL],
    FORWARD: [PlayerStyle.SPEEDY, PlayerStyle.POWERFUL, PlayerStyle.TECHNICAL, PlayerStyle.ATTACKING],
};

function randomInt(rng: seedrandom.PRNG, min: number, max: number): number {
    return Math.floor(rng() * (max - min + 1)) + min;
}

function pickRandom<T>(rng: seedrandom.PRNG, arr: T[]): T {
    return arr[Math.floor(rng() * arr.length)];
}

function generateName(rng: seedrandom.PRNG): { name: string; surname: string } {
    const name = pickRandom(rng, PLAYER_FIRST_NAMES);
    const surname = pickRandom(rng, PLAYER_LAST_NAMES);
    return { name, surname };
}

function generateStatsForRole(
    rng: seedrandom.PRNG,
    role: PlayerRole,
    style: PlayerStyle,
    ovr: number,
): Pick<GeneratedPlayer, "pace" | "shooting" | "passing" | "dribbling" | "defending" | "physical" | "goalkeeping"> {
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

export function generatePlayer(options: GenerateOptions = {}): GeneratedPlayer {
    const rng = seedrandom(options.seed || Math.random().toString());

    const ovrMin = options.ovrMin ?? DRAFT.STARTER_OVR_MIN;
    const ovrMax = options.ovrMax ?? DRAFT.STARTER_OVR_MAX;
    const ovr = randomInt(rng, ovrMin, ovrMax);

    const role = options.role ?? pickRandom(rng, Object.values(PlayerRole) as PlayerRole[]);
    const position = options.position ?? pickRandom(rng, POSITIONS_BY_ROLE[role]);
    const style = pickRandom(rng, STYLES_BY_ROLE[role]);

    const stats = generateStatsForRole(rng, role, style, ovr);
    const potentialMin = randomInt(rng, ovr + 2, Math.min(99, ovr + 10));
    const potentialMax = randomInt(rng, potentialMin + 5, Math.min(99, potentialMin + 15));
    const form = randomInt(rng, 60, 100);
    const age = randomInt(rng, 17, 34);
    const nationality = pickRandom(rng, PLAYER_NATIONALITIES);
    const club = pickRandom(rng, PLAYER_CLUBS);
    const clubId = randomInt(rng, 1, 100);
    
    // Physicals and Skills
    const height = randomInt(rng, 165, 205);
    const weight = randomInt(rng, 60, 95);
    const foot = rng() > 0.7 ? "Left" : "Right";
    const skillMoves = randomInt(rng, 1, 5);
    const weakFoot = randomInt(rng, 1, 5);
    const country = nationality || "RU";

    // Visuals
    const face = pickRandom(rng, FACES);
    const hairStyle = pickRandom(rng, HAIR_STYLES);
    const hairColor = pickRandom(rng, HAIR_COLORS);
    const skinColor = pickRandom(rng, SKIN_COLORS);
    const beardStyle = pickRandom(rng, BEARD_STYLES);
    const beardColor = beardStyle === "none" ? "none" : hairColor;
    const emotion = pickRandom(rng, EMOTIONS);
    const rarity = ovr > 85 ? "gold" : pickRandom(rng, RARITIES);

    const { name, surname } = generateName(rng);

    return {
        name,
        surname,
        ovr,
        position,
        role,
        style,
        potentialMin,
        potentialMax,
        height,
        weight,
        foot,
        skillMoves,
        weakFoot,
        country,
        form,
        age,
        nationality,
        club,
        clubId,
        trainingLevel: 1,
        trainingLevelMax: 25,
        trainingExperience: 0,
        trainingExperienceRequired: 200,
        face,
        hairStyle,
        hairColor,
        skinColor,
        beardStyle,
        beardColor,
        emotion,
        rarity,
        ...stats,
    };
}

export function generateMultiplePlayers(
    count: number,
    options: GenerateOptions = {},
): GeneratedPlayer[] {
    const players: GeneratedPlayer[] = [];
    for (let i = 0; i < count; i++) {
        players.push(
            generatePlayer({
                ...options,
                seed: (options.seed || "gen") + `-${i}-${Date.now()}`,
            }),
        );
    }
    return players;
}
