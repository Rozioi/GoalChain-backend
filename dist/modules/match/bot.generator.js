"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBotTeam = generateBotTeam;
const player_generator_1 = require("../player/player.generator");
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
    "bot_pro",
    "bot_king",
    "bot_striker",
    "bot_legend",
    "bot_ace",
    "bot_champ",
    "bot_wizard",
    "bot_titan",
    "bot_phenom",
    "bot_maestro",
    "bot_shadow",
    "bot_blitz",
    "bot_vortex",
    "bot_nova",
    "bot_phantom",
];
function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
async function generateBotTeam(app, targetRating) {
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
    let templateTeam;
    if (existingBotTeam) {
        app.log.info(`[BotGenerator] Reusing bot team "${existingBotTeam.name}" (rating ${existingBotTeam.rating}) for target ${targetRating}`);
        templateTeam = existingBotTeam;
    }
    else {
        app.log.info(`[BotGenerator] No suitable bot team found for target ${targetRating}, generating new one`);
        const ovrMin = Math.max(40, Math.round(targetRating - 10));
        const ovrMax = Math.min(95, Math.round(targetRating + 5));
        const gk = await (0, player_generator_1.generateMultiplePlayers)(1, {
            role: "GOALKEEPER",
            ovrMin,
            ovrMax,
            seed: `bot-pool-gk-${targetRating}-${Date.now()}`,
        });
        const def = await (0, player_generator_1.generateMultiplePlayers)(4, {
            role: "DEFENDER",
            ovrMin,
            ovrMax,
            seed: `bot-pool-def-${targetRating}-${Date.now()}`,
        });
        const mid = await (0, player_generator_1.generateMultiplePlayers)(4, {
            role: "MIDFIELDER",
            ovrMin,
            ovrMax,
            seed: `bot-pool-mid-${targetRating}-${Date.now()}`,
        });
        const fwd = await (0, player_generator_1.generateMultiplePlayers)(2, {
            role: "FORWARD",
            ovrMin,
            ovrMax,
            seed: `bot-pool-fwd-${targetRating}-${Date.now()}`,
        });
        const allPlayers = [...gk, ...def, ...mid, ...fwd];
        let botUser = await app.prisma.user.findUnique({
            where: { telegramId: "bot-system" },
        });
        if (!botUser) {
            const randomUsername = pickRandom(BOT_USERNAMES);
            botUser = await app.prisma.user.create({
                data: {
                    telegramId: "bot-system",
                    username: randomUsername,
                    clubName: "Bot System",
                    clubIcon: "1",
                    referralCode: "BOT-SYSTEM-CODE",
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
        }));
        app.log.info(`[BotGenerator] Created new bot pool team "${poolTeam.name}" (id: ${poolTeam.id})`);
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
    app.log.info(`[BotGenerator] Created match team "${matchTeam.name}" from pool (${templateTeam.players.length} players)`);
    return { team: matchTeam, starters };
}
