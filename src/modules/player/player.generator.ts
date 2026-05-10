import seedrandom from "seedrandom";
import { Position, PlayerRole, PlayerStyle } from "@prisma/client";
import {
  PLAYER_FIRST_NAMES,
  PLAYER_LAST_NAMES,
  DRAFT,
  PLAYER_NATIONALITIES,
  PLAYER_CLUBS,
} from "../../config/constants";
import { removeBackground } from "@imgly/background-removal-node";
import fs from "fs";
import sharp from "sharp";

import path from "path";

async function processPlayerImage(
  imageUrl: string,
  fileName: string,
): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return imageUrl;

    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    const tempDir = "./temp/raw-players/";
    const publicDir = "./public/generated-players/";
    [tempDir, publicDir].forEach((dir) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    const tempPath = path.resolve(`${tempDir}${fileName}_raw.jpg`);
    fs.writeFileSync(tempPath, imageBuffer);

    try {
      console.log(`[ImageGen] Удаление фона из файла: ${tempPath}`);

      const resultBlob = await removeBackground(tempPath);

      const resultBuffer = Buffer.from(await resultBlob.arrayBuffer());
      const finalPath = `${publicDir}${fileName}.png`;

      fs.writeFileSync(finalPath, resultBuffer);

      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

      return `https://lividly-hot-gaur.cloudpub.ru/generated-players/${fileName}.png`;
    } catch (removeBgError) {
      console.error("[@imgly] Ошибка нейросети:", removeBgError);
      return imageUrl;
    }
  } catch (error) {
    console.error("Критическая ошибка:", error);
    return imageUrl;
  }
}
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

function generateImageUrl(player: Partial<GeneratedPlayer>): string {
  const prompt = `
    Professional sports photography,
    close-up portrait of a football player,
    ${player.name} ${player.surname},
    wearing ${player.nationality} national kit,
    ${player.skinColor} skin,
    ${player.hairStyle} ${player.hairColor} hair,
    ${player.beardStyle !== "none" ? player.beardStyle + " beard" : "no beard"},
    ${player.emotion} expression,
    isolated on white background,
    studio lighting,
    high contrast,
    8k resolution,
    EA Sports FC render style,
    no background
  `
    .replace(/\s+/g, " ")
    .trim();

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${Math.floor(Math.random() * 1000000)}&model=flux`;
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

  const leagueLevel = randomInt(rng, 1, 70);
  const leagueDivisionId = leagueLevel > 35 ? 2 : 1;
  const leagueId = leagueLevel > 35 ? leagueLevel - 35 : leagueLevel;

  const leagueBaseOVR = Math.max(40, 95 - leagueLevel);
  const overallRating = randomInt(
    rng,
    leagueBaseOVR - 5,
    Math.min(99, leagueBaseOVR + 5),
  );

  const role =
    options.role ?? pickRandom(rng, Object.values(PlayerRole) as PlayerRole[]);
  const position = options.position ?? pickRandom(rng, POSITIONS_BY_ROLE[role]);
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
  const club = pickRandom(rng, PLAYER_CLUBS);
  const clubId = randomInt(rng, 1, 100);

  const heightCm = randomInt(rng, 165, 205);
  const weightKg = randomInt(rng, 60, 95);
  const foot = rng() > 0.7 ? "Left" : "Right";
  const skillMoves = randomInt(rng, 1, 5);
  const weakFoot = randomInt(rng, 1, 5);
  const country = nationality || "RU";

  const appearance = mapAppearanceFromNationality(rng, nationality);

  const rarity =
    overallRating > 85 ? "gold" : overallRating > 75 ? "rare" : "common";

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

  const fileName = `${name}_${surname}_${Date.now()}`.toLowerCase();
  const finalImageUrl = await processPlayerImage(
    generateImageUrl(playerData),
    fileName,
  );

  return {
    ...playerData,
    imageUrl: finalImageUrl,
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
  return players;
}
