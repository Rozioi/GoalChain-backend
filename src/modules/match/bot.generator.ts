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
    const existingBotTeam = await app.prisma.team.findFirst({
        where: {
            isBot: true,
            rating: {
                gte: targetRating - RATING_TOLERANCE,
                lte: targetRating + RATING_TOLERANCE,
            },
        },
        include: {
            players: {
                include: { player: true },
            },
        },
    });

    let templateTeam: {
        id: string;
        name: string;
        rating: number;
        formation: string;
        userId: string;
        players: Array<{
            isStarter: boolean;
            positionInFormation: string | null;
            player: { id: string };
        }>;
    };

    if (existingBotTeam) {
        app.log.info(
            `[BotGenerator] Reusing bot team "${existingBotTeam.name}" (rating ${existingBotTeam.rating}) for target ${targetRating}`,
        );
        templateTeam = existingBotTeam;
    } else {
        app.log.info(
            `[BotGenerator] No suitable bot team found for target ${targetRating}, generating new one`,
        );

        const ovrMin = Math.max(40, Math.round(targetRating - 10));
        const ovrMax = Math.min(95, Math.round(targetRating + 5));

        const gk = await generateMultiplePlayers(1, {
            role: "GOALKEEPER" as PlayerRole,
            ovrMin,
            ovrMax,
            seed: `bot-pool-gk-${targetRating}-${Date.now()}`,
        });
        const def = await generateMultiplePlayers(4, {
            role: "DEFENDER" as PlayerRole,
            ovrMin,
            ovrMax,
            seed: `bot-pool-def-${targetRating}-${Date.now()}`,
        });
        const mid = await generateMultiplePlayers(4, {
            role: "MIDFIELDER" as PlayerRole,
            ovrMin,
            ovrMax,
            seed: `bot-pool-mid-${targetRating}-${Date.now()}`,
        });
        const fwd = await generateMultiplePlayers(2, {
            role: "FORWARD" as PlayerRole,
            ovrMin,
            ovrMax,
            seed: `bot-pool-fwd-${targetRating}-${Date.now()}`,
        });

        const allPlayers = [...gk, ...def, ...mid, ...fwd];

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

        templateTeam = (await app.prisma.team.findUnique({
            where: { id: poolTeam.id },
            include: {
                players: {
                    include: { player: true },
                },
            },
        })) as typeof templateTeam;

        app.log.info(
            `[BotGenerator] Created new bot pool team "${poolTeam.name}" (id: ${poolTeam.id})`,
        );
    }

    const matchTeam = await app.prisma.team.create({
        data: {
            name: pickRandom(BOT_CLUB_NAMES),
            userId: templateTeam.userId,
            rating: targetRating,
            formation: templateTeam.formation,
        },
    });

    const starters = [];
    for (const tp of templateTeam.players) {
        await app.prisma.teamPlayer.create({
            data: {
                teamId: matchTeam.id,
                playerId: tp.player.id,
                isStarter: tp.isStarter,
                positionInFormation: tp.positionInFormation,
            },
        });
        starters.push(tp.player);
    }

    app.log.info(
        `[BotGenerator] Created match team "${matchTeam.name}" from pool (${templateTeam.players.length} players)`,
    );

    return { team: matchTeam, starters };
}
