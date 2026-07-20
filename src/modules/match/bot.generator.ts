import { FastifyInstance } from "fastify";
import { generateMultiplePlayers } from "../player/player.generator";
import { PlayerRole } from "@prisma/client";

const RATING_TOLERANCE = 15;

const BOT_CLUB_NAMES = [
    "FC Phoenix",
    "Red Devils",
    "Blue Sharks",
    "Golden Eagles",
    "Storm Breakers",
    "Night Hawks",
    "Silver Arrows",
    "Iron Lions",
    "Crimson Tide",
    "Shadow Warriors",
    "Royal Kings",
    "Ice Falcons",
    "Thunder Wolves",
    "Black Panthers",
    "Frozen Flames",
    "Velvet Giants",
    "Neon Knights",
    "Brave Hearts",
    "Wild Wolves",
    "Sky Riders",
    "Dark Horses",
    "Fire Birds",
    "Ocean Titans",
    "Star Warriors",
    "Prime Athletes",
    "Victory FC",
    "Unity FC",
    "Glory Hunters",
    "Zenith FC",
    "Apex Predators",
];

const BOT_USERNAMES = [
    "ProGamer",
    "KingPlayer",
    "StarStriker",
    "LegendWin",
    "AcePlayer",
    "ChampionX",
    "MagicWizard",
    "TitanFC",
    "PhenomX",
    "GameMaestro",
    "ShadowPlay",
    "BlitzKing",
    "VortexPro",
    "NovaStar",
    "PhantomX",
    "GoldenFoot",
    "IronWill",
    "SilverStorm",
    "CrimsonKing",
    "NeonFlash",
];

function pickRandom<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export async function generateBotTeam(
    app: FastifyInstance,
    targetRating: number,
) {
    // Не переиспользуем бот-команды — каждый раз создаём новую,
    // чтобы у игрока было разнообразие соперников.
    // Используем статический бот-юзер как владельца команд.
    // const existingBotTeam = ... — удалено

    app.log.info(
        `[BotGenerator] Generating new bot team for target rating ${targetRating}`,
    );

    // targetRating — это team.rating, который считается через calculateTeamRating
    // (средний OVR + бонус синергии) и может быть > 99.
    // Нормализуем до реального OVR игрока (1-99).
    // Бот должен быть примерно на уровне игрока: ±5 OVR.
    const playerOvr = Math.round(targetRating);
    const baseOvr = Math.min(playerOvr, 99);
    const ovrMin = Math.max(40, Math.round(baseOvr - 5));
    const ovrMax = Math.min(99, Math.round(baseOvr + 5));

    // Случайный seed для разнообразия
    const seed = `bot-${targetRating}-${Date.now()}-${Math.random()}`;

    const gk = await generateMultiplePlayers(1, {
        role: "GOALKEEPER" as PlayerRole,
        ovrMin,
        ovrMax,
        seed: `gk-${seed}`,
    });
    const def = await generateMultiplePlayers(4, {
        role: "DEFENDER" as PlayerRole,
        ovrMin,
        ovrMax,
        seed: `def-${seed}`,
    });
    const mid = await generateMultiplePlayers(4, {
        role: "MIDFIELDER" as PlayerRole,
        ovrMin,
        ovrMax,
        seed: `mid-${seed}`,
    });
    const fwd = await generateMultiplePlayers(2, {
        role: "FORWARD" as PlayerRole,
        ovrMin,
        ovrMax,
        seed: `fwd-${seed}`,
    });

    const allPlayers = [...gk, ...def, ...mid, ...fwd];

    // Используем системного бот-юзера
    let botUser = await app.prisma.user.findUnique({
        where: { telegramId: "system-bot-pool" },
    });

    if (!botUser) {
        const randomUsername = pickRandom(BOT_USERNAMES);
        botUser = await app.prisma.user.create({
            data: {
                telegramId: "system-bot-pool",
                username: randomUsername,
                clubName: "Pro Academy",
                clubIcon: "1",
                referralCode: "SYS-POOL-" + Date.now(),
            },
        });
    }

    // Создаём новый пул игроков
    const poolTeam = await app.prisma.team.create({
        data: {
            name: pickRandom(BOT_CLUB_NAMES),
            userId: botUser.id,
            rating: targetRating,
            formation: "4-4-2",
            isBot: true,
        },
    });

    for (const gp of allPlayers) {
        const player = await app.prisma.player.create({ data: gp });
        await app.prisma.teamPlayer.create({
            data: {
                teamId: poolTeam.id,
                playerId: player.id,
                isStarter: true,
                positionInFormation: gp.position,
            },
        });
    }

    // Пуллинг команду используем как match-team напрямую
    // (каждый матч — новая команда с новыми игроками)
    const matchTeam = poolTeam;

    const starters = allPlayers;

    app.log.info(
        `[BotGenerator] Created bot team "${matchTeam.name}" (id: ${matchTeam.id}, rating: ${matchTeam.rating}, players: ${starters.length})`,
    );

    return { team: matchTeam, starters };
}
