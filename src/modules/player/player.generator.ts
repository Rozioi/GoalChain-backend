import seedrandom from "seedrandom";
import { Position, PlayerRole, PlayerStyle } from "@prisma/client";
import {
    PLAYER_FIRST_NAMES,
    PLAYER_LAST_NAMES,
    DRAFT,
    PLAYER_NATIONALITIES,
    PLAYER_CLUBS,
} from "../../config/constants";
import { generatePlayerImage } from "./playerImage.together";
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
    overallRating: number;
    position: Position;
    role: PlayerRole;
    style: PlayerStyle;
    pace: number;
    paceBonus: number;
    shooting: number;
    shootingBonus: number;
    passing: number;
    passingBonus: number;
    dribbling: number;
    dribblingBonus: number;
    defending: number;
    defendingBonus: number;
    physical: number;
    physicalBonus: number;
    goalkeeping: number;
    potentialMin: number;
    potentialMax: number;
    heightCm: number;
    weightKg: number;
    foot: string;
    skillMoves: number;
    weakFoot: number;
    country: string;
    formValue: number;
    age: number;
    nationality: string;
    club: string;
    clubId: number;
    leagueId: number;
    leagueDivisionId: number;
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
    imageUrl?: string;
}

function generateImagePrompt(player: Partial<GeneratedPlayer>): string {
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

function generateImageUrlFromPrompt(prompt: string): string {
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

const POSITIONS_BY_ROLE: Record<PlayerRole, Position[]> = {
    GOALKEEPER: [Position.GK],
    DEFENDER: [Position.CB, Position.LB, Position.RB],
    MIDFIELDER: [Position.CDM, Position.CM, Position.CAM],
    FORWARD: [Position.LW, Position.RW, Position.ST, Position.CF],
};

const STYLES_BY_ROLE: Record<PlayerRole, PlayerStyle[]> = {
    GOALKEEPER: [
        PlayerStyle.POSITIONAL,
        PlayerStyle.DEFENSIVE,
        PlayerStyle.ATTACKING,
    ],
    DEFENDER: [
        PlayerStyle.POWERFUL,
        PlayerStyle.SPEEDY,
        PlayerStyle.POSITIONAL,
        PlayerStyle.DEFENSIVE,
    ],
    MIDFIELDER: [
        PlayerStyle.TECHNICAL,
        PlayerStyle.ATTACKING,
        PlayerStyle.DEFENSIVE,
        PlayerStyle.POSITIONAL,
    ],
    FORWARD: [
        PlayerStyle.SPEEDY,
        PlayerStyle.POWERFUL,
        PlayerStyle.TECHNICAL,
        PlayerStyle.ATTACKING,
    ],
};

function randomInt(rng: seedrandom.PRNG, min: number, max: number): number {
    return Math.floor(rng() * (max - min + 1)) + min;
}

function pickRandom<T>(rng: seedrandom.PRNG, arr: readonly T[]): T {
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
    overallRating: number,
): Pick<
    GeneratedPlayer,
    | "pace"
    | "shooting"
    | "passing"
    | "dribbling"
    | "defending"
    | "physical"
    | "goalkeeping"
> {
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
        goalkeeping:
            role === "GOALKEEPER"
                ? randomInt(
                      rng,
                      overallRating - 5,
                      Math.min(99, overallRating + 10),
                  )
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

function mapAppearanceFromNationality(
    rng: seedrandom.PRNG,
    nationality: string,
) {
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
    } else if (african.includes(nationality)) {
        skinColor = "dark";
        hairColor = "black";
    } else if (southAmerican.includes(nationality)) {
        skinColor = rng() > 0.5 ? "tan" : "light";
        hairColor = pickRandom(rng, ["black", "brown"]);
    } else if (asian.includes(nationality)) {
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

export async function generatePlayer(
    options: GenerateOptions = {},
): Promise<GeneratedPlayer> {
    const rng = seedrandom(options.seed || Math.random().toString());

    const leagueLevel =
        options.ovrMin !== undefined && options.ovrMax !== undefined
            ? 0
            : randomInt(rng, 1, 70);
    const leagueDivisionId = leagueLevel > 35 ? 2 : 1;
    const leagueId = leagueLevel > 35 ? leagueLevel - 35 : leagueLevel;

    let overallRating;
    if (options.ovrMin !== undefined && options.ovrMax !== undefined) {
        overallRating = randomInt(rng, options.ovrMin, options.ovrMax);
    } else {
        const leagueBaseOVR = Math.max(40, 95 - leagueLevel);
        overallRating = randomInt(
            rng,
            leagueBaseOVR - 5,
            Math.min(99, leagueBaseOVR + 5),
        );
    }

    const role =
        options.role ??
        pickRandom(rng, Object.values(PlayerRole) as PlayerRole[]);
    const position =
        options.position ?? pickRandom(rng, POSITIONS_BY_ROLE[role]);
    const style = pickRandom(rng, STYLES_BY_ROLE[role]);

    const stats = generateStatsForRole(rng, role, style, overallRating);
    const potentialMin = randomInt(
        rng,
        overallRating + 2,
        Math.min(99, overallRating + 10),
    );
    const potentialMax = randomInt(
        rng,
        potentialMin + 5,
        Math.min(99, potentialMin + 15),
    );

    const formValue = 1.0 + randomInt(rng, -10, 20) / 100;
    const age = randomInt(rng, 17, 34);
    const nationality = pickRandom(rng, PLAYER_NATIONALITIES);
    const clubIndex = Math.floor(rng() * PLAYER_CLUBS.length);
    const club = PLAYER_CLUBS[clubIndex];
    const clubId = clubIndex + 1; // 1-indexed for emblems

    const heightCm = randomInt(rng, 165, 205);
    const weightKg = randomInt(rng, 60, 95);
    const foot = rng() > 0.7 ? "Left" : "Right";

    // Skill Moves logic based on position and OVR
    const isDefenderOrGK =
        role === PlayerRole.GOALKEEPER ||
        role === PlayerRole.DEFENDER ||
        position === Position.CB ||
        position === Position.LB ||
        position === Position.RB;
    let skillMoves: number;
    if (isDefenderOrGK) {
        skillMoves = randomInt(rng, 1, 2); // 1 or 2 stars
    } else {
        // Forwards, Midfielders, etc.
        if (overallRating >= 85) {
            skillMoves = randomInt(rng, 4, 5); // 4 or 5 stars
        } else if (overallRating >= 75) {
            skillMoves = randomInt(rng, 3, 4); // 3 or 4 stars
        } else if (overallRating >= 60) {
            skillMoves = 3; // 3 stars
        } else {
            skillMoves = 2; // 2 stars
        }
    }

    const weakFoot = randomInt(rng, 1, 5);
    const country = nationality || "RU";

    const appearance = mapAppearanceFromNationality(rng, nationality);

    const rarity =
        overallRating >= 75
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

    // Генерация карточки игрока через OpenAI DALL-E 3
    const fileName = `${name}_${surname}_${Date.now()}`.toLowerCase();
    const generatedImage = await generatePlayerImage(
        {
            name,
            surname,
            nationality,
            club,
            overallRating,
            position,
            pace: playerData.pace,
            shooting: playerData.shooting,
            passing: playerData.passing,
            dribbling: playerData.dribbling,
            defending: playerData.defending,
            physical: playerData.physical,
        },
        rarity,
        fileName,
    );

    return {
        ...playerData,
        imageUrl: generatedImage || "https://i.ibb.co/gLBvTrQj/result-card.png",
    };
}

export async function generateMultiplePlayers(
    count: number,
    options: GenerateOptions = {},
): Promise<GeneratedPlayer[]> {
    const players: GeneratedPlayer[] = [];
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
