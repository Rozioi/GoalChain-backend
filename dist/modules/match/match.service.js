"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.playFriendlyMatch = playFriendlyMatch;
exports.playBotMatch = playBotMatch;
exports.updateMatchTactics = updateMatchTactics;
exports.inviteFriend = inviteFriend;
exports.createOpenChallenge = createOpenChallenge;
exports.acceptMatch = acceptMatch;
exports.getMatchById = getMatchById;
exports.cancelMatchmaking = cancelMatchmaking;
exports.getMatchHistory = getMatchHistory;
const crypto_1 = require("crypto");
const match_simulator_1 = require("./match.simulator");
const bot_generator_1 = require("./bot.generator");
const constants_1 = require("../../config/constants");
const task_service_1 = require("../task/task.service");
async function getTeamForMatch(app, teamId) {
    const team = await app.prisma.team.findUnique({
        where: { id: teamId },
        include: {
            players: {
                include: { player: true },
            },
        },
    });
    if (!team)
        throw new Error("Team not found");
    const mapPlayer = (tp) => ({
        id: tp.player.id,
        name: tp.player.name,
        overallRating: tp.player.overallRating,
        pace: tp.player.pace,
        shooting: tp.player.shooting,
        passing: tp.player.passing,
        dribbling: tp.player.dribbling,
        defending: tp.player.defending,
        physical: tp.player.physical,
        goalkeeping: tp.player.goalkeeping,
        formValue: tp.player.formValue,
        fatigue: tp.player.fatigue,
        position: tp.player.position,
        role: tp.player.role,
        style: tp.player.style,
    });
    return {
        rating: team.rating,
        formation: team.formation,
        starters: team.players.filter((tp) => tp.isStarter).map(mapPlayer),
        bench: team.players.filter((tp) => !tp.isStarter).map(mapPlayer),
        pressingType: "MEDIUM",
    };
}
async function playFriendlyMatch(app, userId) {
    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error("User not found");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (user.dailyMatchesResetAt < today) {
        await app.prisma.user.update({
            where: { id: userId },
            data: { dailyMatchesPlayed: 0, dailyMatchesResetAt: new Date() },
        });
    }
    else if (user.dailyMatchesPlayed >= constants_1.MATCH.DAILY_FRIENDLY_LIMIT) {
        throw new Error(`Daily match limit reached (${constants_1.MATCH.DAILY_FRIENDLY_LIMIT})`);
    }
    const myTeam = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
    });
    if (!myTeam)
        throw new Error("No team found. Complete the draft first.");
    const myExistingLobby = await app.prisma.match.findFirst({
        where: {
            type: "FRIENDLY",
            status: "PENDING",
            homeUserId: userId,
            createdAt: { gte: new Date(Date.now() - 30000) },
        },
    });
    if (myExistingLobby) {
        return waitForOpponent(app, userId, myExistingLobby);
    }
    const existingLobby = await app.prisma.match.findFirst({
        where: {
            type: "FRIENDLY",
            status: "PENDING",
            awayUserId: null,
            homeUserId: { not: userId },
            homeUser: {
                points: {
                    gte: user.points - 300,
                    lte: user.points + 300,
                },
            },
        },
        orderBy: { createdAt: "asc" },
    });
    if (existingLobby) {
        // Atomic join attempt
        const updateResult = await app.prisma.match.updateMany({
            where: {
                id: existingLobby.id,
                awayUserId: null,
                status: "PENDING",
            },
            data: {
                awayUserId: userId,
                awayTeamId: myTeam.id,
            },
        });
        if (updateResult.count > 0) {
            const seed = (0, crypto_1.randomUUID)();
            const homeTeamData = await getTeamForMatch(app, existingLobby.homeTeamId);
            const awayTeamData = await getTeamForMatch(app, myTeam.id);
            const result = (0, match_simulator_1.simulateMatch)(homeTeamData, awayTeamData, seed);
            const awayMatchNumber = user.dailyMatchesPlayed + 1;
            const awayDiminish = Math.pow(constants_1.MATCH.REWARDS.DIMINISHING_FACTOR, awayMatchNumber - 1);
            await handleMatchCompletion(app, { ...existingLobby, awayUserId: userId, awayTeamId: myTeam.id }, result, seed);
            await app.prisma.user.updateMany({
                where: { id: { in: [existingLobby.homeUserId, userId] } },
                data: { dailyMatchesPlayed: { increment: 1 } },
            });
            return {
                match: {
                    ...existingLobby,
                    awayUserId: userId,
                    awayTeamId: myTeam.id,
                    homeScore: result.homeScore,
                    awayScore: result.awayScore,
                },
                result,
                rewards: {
                    coins: result.winner === "away"
                        ? Math.floor(constants_1.MATCH.REWARDS.WIN_COINS * awayDiminish)
                        : result.winner === "draw"
                            ? Math.floor(constants_1.MATCH.REWARDS.DRAW_COINS * awayDiminish)
                            : Math.floor(constants_1.MATCH.REWARDS.LOSS_COINS * awayDiminish),
                    exp: result.winner === "away"
                        ? Math.floor(constants_1.MATCH.REWARDS.WIN_EXP * awayDiminish)
                        : result.winner === "draw"
                            ? Math.floor(constants_1.MATCH.REWARDS.DRAW_EXP * awayDiminish)
                            : Math.floor(constants_1.MATCH.REWARDS.LOSS_EXP * awayDiminish),
                },
                isBot: false,
            };
        }
    }
    // If no lobby found or join failed, create a new one
    const myLobby = await app.prisma.match.create({
        data: {
            type: "FRIENDLY",
            status: "PENDING",
            homeUserId: userId,
            homeTeamId: myTeam.id,
        },
    });
    return waitForOpponent(app, userId, myLobby);
}
async function waitForOpponent(app, userId, lobby) {
    if (!lobby || !lobby.id)
        throw new Error("Invalid lobby provided to waitForOpponent");
    const waitStart = Date.now();
    const timeout = 12000; // Wait up to 12 seconds
    while (Date.now() - waitStart < timeout) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const updatedMatch = await app.prisma.match.findUnique({
            where: { id: lobby.id },
            include: {
                events: { orderBy: { minute: "asc" } },
                homeUser: true,
                awayUser: true,
            },
        });
        if (updatedMatch && updatedMatch.status === "CANCELLED") {
            throw new Error("Matchmaking cancelled by user");
        }
        if (updatedMatch &&
            updatedMatch.status === "COMPLETED" &&
            updatedMatch.awayUserId) {
            return {
                match: updatedMatch,
                result: {
                    homeScore: updatedMatch.homeScore,
                    awayScore: updatedMatch.awayScore,
                    winner: updatedMatch.homeScore > updatedMatch.awayScore
                        ? "home"
                        : updatedMatch.awayScore > updatedMatch.homeScore
                            ? "away"
                            : "draw",
                    events: updatedMatch.events.map((e) => {
                        let type = e.type.toLowerCase();
                        if (type === "yellow_card")
                            type = "yellowCard";
                        if (type === "red_card")
                            type = "redCard";
                        if (type === "tactic_change")
                            type = "tacticChange";
                        return {
                            minute: e.minute,
                            type,
                            team: e.team,
                            playerId: e.playerId,
                            playerName: e.playerName,
                            playerOutId: e.playerOutId,
                            playerOutName: e.playerOutName,
                            description: e.description,
                        };
                    }),
                },
                rewards: { coins: updatedMatch.homeCoins, exp: updatedMatch.homeExp },
                isBot: false,
            };
        }
    }
    const finalCheck = await app.prisma.match.findUnique({
        where: { id: lobby.id },
    });
    if (finalCheck?.status === "COMPLETED") {
        return getMatchById(app, lobby.id);
    }
    await app.prisma.match.update({
        where: { id: lobby.id },
        data: { status: "CANCELLED" },
    });
    return playBotMatch(app, userId);
}
async function playBotMatch(app, userId) {
    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error("User not found");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (user.dailyMatchesResetAt < today) {
        await app.prisma.user.update({
            where: { id: userId },
            data: { dailyMatchesPlayed: 0, dailyMatchesResetAt: new Date() },
        });
    }
    else if (user.dailyMatchesPlayed >= constants_1.MATCH.DAILY_FRIENDLY_LIMIT) {
        throw new Error(`Daily match limit reached (${constants_1.MATCH.DAILY_FRIENDLY_LIMIT})`);
    }
    const myTeam = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
    });
    if (!myTeam)
        throw new Error("No team found");
    const botResult = await (0, bot_generator_1.generateBotTeam)(app, myTeam.rating);
    const seed = (0, crypto_1.randomUUID)();
    const homeTeamData = await getTeamForMatch(app, myTeam.id);
    const awayTeamData = await getTeamForMatch(app, botResult.team.id);
    const result = (0, match_simulator_1.simulateMatch)(homeTeamData, awayTeamData, seed);
    const match = await app.prisma.match.create({
        data: {
            type: "FRIENDLY",
            status: "COMPLETED",
            homeUserId: userId,
            homeTeamId: myTeam.id,
            awayTeamId: botResult.team.id,
            isBot: true,
            homeScore: result.homeScore,
            awayScore: result.awayScore,
            seed,
        },
    });
    await handleMatchCompletion(app, match, result, seed);
    await app.prisma.user.update({
        where: { id: userId },
        data: { dailyMatchesPlayed: { increment: 1 } },
    });
    return {
        match,
        result,
        rewards: {
            coins: result.winner === "home"
                ? constants_1.MATCH.REWARDS.WIN_COINS
                : constants_1.MATCH.REWARDS.LOSS_COINS,
            exp: result.winner === "home"
                ? constants_1.MATCH.REWARDS.WIN_EXP
                : constants_1.MATCH.REWARDS.LOSS_EXP,
        },
        isBot: true,
    };
}
async function updateMatchTactics(app, matchId, userId, tactics) {
    const match = await app.prisma.match.findUnique({
        where: { id: matchId },
        include: { events: true },
    });
    if (!match)
        throw new Error("Match not found");
    if (match.status !== "IN_PROGRESS" && match.status !== "COMPLETED")
        throw new Error("Match not active");
    const isHome = match.homeUserId === userId;
    const isAway = match.awayUserId === userId;
    if (!isHome && !isAway)
        throw new Error("Not your match");
    const team = isHome ? "home" : "away";
    const lastEvent = match.events.length > 0
        ? match.events.reduce((max, e) => (e.minute > max.minute ? e : max), match.events[0])
        : null;
    const currentMinute = lastEvent ? Math.min(lastEvent.minute + 1, 90) : 1;
    const tacticEvent = await app.prisma.matchEvent.create({
        data: {
            matchId,
            minute: currentMinute,
            team,
            type: tactics.pressingType ? "TACTIC_CHANGE" : "SUBSTITUTION",
            description: tactics.pressingType
                ? `Tactical change: Team switched to ${tactics.pressingType} pressing.`
                : tactics.substitutions && tactics.substitutions.length > 0
                    ? `Manual substitution(s) requested.`
                    : "Tactical adjustment made.",
        },
    });
    if (tactics.pressingType) {
        await app.prisma.match.update({
            where: { id: matchId },
            data: isHome
                ? { homePressingType: tactics.pressingType }
                : { awayPressingType: tactics.pressingType },
        });
    }
    const allEvents = [...match.events, tacticEvent];
    const pressingChanges = [];
    const manualSubstitutions = [];
    const lockedEvents = [];
    for (const e of allEvents) {
        if (e.type === "TACTIC_CHANGE" && e.description.includes("switching to")) {
            const parts = e.description.split(" ");
            const type = parts[parts.length - 2];
            pressingChanges.push({ minute: e.minute, team: e.team, type });
        }
        else if (e.type === "TACTIC_CHANGE" &&
            e.description.includes("switched to")) {
            const parts = e.description.split(" ");
            const type = parts[parts.length - 2]; // "switched", "to", "INTENSIVE", "pressing."
            pressingChanges.push({ minute: e.minute, team: e.team, type });
        }
        else if (e.type === "SUBSTITUTION" ||
            e.description.includes("substitution")) {
            // Logic for retrieving previous manual subs from description if needed
            // For now we assume the current call adds the newest batch
        }
        if (e.minute < currentMinute &&
            !["TACTIC_CHANGE", "SUBSTITUTION"].includes(e.type)) {
            lockedEvents.push({
                minute: e.minute,
                type: e.type.toLowerCase(),
                team: e.team,
                playerId: e.playerId,
                playerName: e.playerName,
                description: e.description,
            });
        }
    }
    if (tactics.substitutions) {
        for (const sub of tactics.substitutions) {
            manualSubstitutions.push({
                minute: currentMinute,
                team,
                outId: sub.outId,
                inId: sub.inId,
            });
        }
    }
    const homeTeamData = await getTeamForMatch(app, match.homeTeamId);
    if (!match.awayTeamId)
        throw new Error("Away team not set for this match");
    const awayTeamData = await getTeamForMatch(app, match.awayTeamId);
    homeTeamData.pressingType = match.homePressingType;
    awayTeamData.pressingType = match.awayPressingType;
    const result = (0, match_simulator_1.simulateMatch)(homeTeamData, awayTeamData, match.seed, {
        pressingChanges,
        manualSubstitutions,
        lockedEvents,
        skipUntilMinute: currentMinute,
    });
    await app.prisma.matchEvent.deleteMany({
        where: {
            matchId,
            minute: { gte: currentMinute },
            id: { not: tacticEvent.id },
        },
    });
    await app.prisma.match.update({
        where: { id: matchId },
        data: {
            homeScore: result.homeScore,
            awayScore: result.awayScore,
            events: {
                create: result.events
                    .filter((e) => e.minute >= currentMinute &&
                    e.description !== tacticEvent.description)
                    .map((e) => ({
                    minute: e.minute,
                    type: e.type.toUpperCase(),
                    team: e.team,
                    playerId: e.playerId,
                    playerName: e.playerName,
                    playerOutId: e.playerOutId,
                    playerOutName: e.playerOutName,
                    description: e.description,
                })),
            },
        },
    });
    return { result };
}
async function inviteFriend(app, userId, friendId) {
    const myTeam = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
    });
    if (!myTeam)
        throw new Error("No team found");
    const friend = await app.prisma.user.findUnique({
        where: { id: friendId },
    });
    if (!friend)
        throw new Error("Friend not found");
    const friendTeam = await app.prisma.team.findFirst({
        where: { userId: friend.id, isEvent: false },
    });
    if (!friendTeam)
        throw new Error("Friend has no team");
    const match = await app.prisma.match.create({
        data: {
            type: "CHALLENGE",
            status: "PENDING",
            homeUserId: userId,
            awayUserId: friend.id,
            homeTeamId: myTeam.id,
            awayTeamId: friendTeam.id,
        },
    });
    const inviter = await app.prisma.user.findUnique({ where: { id: userId } });
    const inviteLink = `https://t.me/goalchaintest_bot/startapp?startapp=challenge_${match.id}`;
    const { bot } = await Promise.resolve().then(() => __importStar(require("../../bot/bot")));
    if (bot && friend.telegramId) {
        const text = `⚽️ *${inviter?.firstName || "Твой друг"}* бросил тебе вызов в Football Manager!\n\nТвоя команда готова к матчу?`;
        await bot.api
            .sendMessage(friend.telegramId, text, {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "Принять вызов ⚔️",
                            url: inviteLink,
                        },
                    ],
                ],
            },
        })
            .catch((err) => console.warn("Failed to send bot notification:", err));
    }
    return {
        matchId: match.id,
        inviteLink,
    };
}
async function createOpenChallenge(app, userId) {
    const myTeam = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
    });
    if (!myTeam)
        throw new Error("No team found");
    const botUser = await app.prisma.user.upsert({
        where: { telegramId: "bot-system" },
        update: {},
        create: {
            telegramId: "bot-system",
            username: "bot_system",
            firstName: "Bot",
            lastName: "System",
            referralCode: "BOT-SYSTEM-" + (0, crypto_1.randomUUID)().slice(0, 8),
        },
    });
    let botTeam = await app.prisma.team.findFirst({
        where: { userId: botUser.id },
    });
    if (!botTeam) {
        botTeam = await app.prisma.team.create({
            data: {
                name: "System Placeholder Team",
                userId: botUser.id,
                rating: 50,
            },
        });
    }
    const match = await app.prisma.match.create({
        data: {
            type: "CHALLENGE",
            status: "PENDING",
            homeUserId: userId,
            homeTeamId: myTeam.id,
            awayTeamId: botTeam.id,
        },
    });
    return {
        matchId: match.id,
        inviteLink: `https://t.me/hdixhrjidj_bot/startapp?startapp=challenge_${match.id}`,
    };
}
async function handleMatchCompletion(app, match, result, seed) {
    await app.prisma.match.update({
        where: { id: match.id },
        data: {
            status: "COMPLETED",
            homeScore: result.homeScore,
            awayScore: result.awayScore,
            seed,
            homeCoins: result.winner === "home"
                ? constants_1.MATCH.REWARDS.WIN_COINS
                : constants_1.MATCH.REWARDS.LOSS_COINS,
            awayCoins: result.winner === "away"
                ? constants_1.MATCH.REWARDS.WIN_COINS
                : constants_1.MATCH.REWARDS.LOSS_COINS,
            events: {
                create: result.events.map((e) => ({
                    minute: e.minute,
                    type: e.type.toUpperCase(),
                    team: e.team,
                    playerId: e.playerId,
                    playerName: e.playerName,
                    description: e.description,
                })),
            },
        },
    });
    const homeId = match.homeUserId;
    const awayId = match.awayUserId;
    const updatePlayer = async (uid, role) => {
        const coins = result.winner === role
            ? constants_1.MATCH.REWARDS.WIN_COINS
            : result.winner === "draw"
                ? constants_1.MATCH.REWARDS.DRAW_COINS
                : constants_1.MATCH.REWARDS.LOSS_COINS;
        const exp = result.winner === role ? 100 : result.winner === "draw" ? 40 : 20;
        const points = result.winner === role ? 25 : result.winner === "draw" ? 10 : -15;
        const user = await app.prisma.user.findUnique({ where: { id: uid } });
        if (!user)
            return;
        let newExp = user.experience + exp;
        let newLevel = user.level;
        const newPoints = Math.max(0, user.points + points);
        while (newExp >= newLevel * 500) {
            newExp -= newLevel * 500;
            newLevel += 1;
        }
        await app.prisma.user.update({
            where: { id: uid },
            data: {
                coins: { increment: coins },
                experience: newExp,
                level: newLevel,
                points: newPoints,
            },
        });
        if (coins > 0) {
            await app.prisma.economyLog.create({
                data: {
                    userId: uid,
                    amount: coins,
                    source: "MATCH_REWARD",
                    details: { matchId: match.id, role, result: result.winner },
                },
            });
        }
        await (0, task_service_1.updateTaskProgress)(app, uid, "MATCHES", 1);
        if (result.winner === role) {
            await (0, task_service_1.updateTaskProgress)(app, uid, "WINS", 1);
        }
        const userScore = role === "home" ? result.homeScore : result.awayScore;
        const opponentScore = role === "home" ? result.awayScore : result.homeScore;
        if (userScore > 0) {
            await (0, task_service_1.updateTaskProgress)(app, uid, "GOALS", userScore);
        }
        if (opponentScore === 0) {
            await (0, task_service_1.updateTaskProgress)(app, uid, "CLEAN_SHEETS", 1);
        }
    };
    if (homeId)
        await updatePlayer(homeId, "home");
    if (awayId)
        await updatePlayer(awayId, "away");
    return {
        homeRewards: {
            coins: result.winner === "home"
                ? constants_1.MATCH.REWARDS.WIN_COINS
                : constants_1.MATCH.REWARDS.LOSS_COINS,
        },
    };
}
async function acceptMatch(app, userId, matchId) {
    const match = await app.prisma.match.findUnique({
        where: { id: matchId },
    });
    if (!match)
        throw new Error("Match not found or expired");
    if (match.homeUserId === userId)
        throw new Error("You cannot challenge yourself");
    if (match.status !== "PENDING")
        throw new Error("This match has already started or been completed");
    if (match.awayUserId && match.awayUserId !== userId) {
        throw new Error("This invitation is intended for another player");
    }
    const myTeam = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
    });
    if (!myTeam)
        throw new Error("No team found. Complete the draft first.");
    if (!match.awayUserId || match.awayTeamId !== myTeam.id) {
        await app.prisma.match.update({
            where: { id: matchId },
            data: {
                awayUserId: userId,
                awayTeamId: myTeam.id,
            },
        });
    }
    const seed = (0, crypto_1.randomUUID)();
    const homeTeamData = await getTeamForMatch(app, match.homeTeamId);
    const awayTeamData = await getTeamForMatch(app, myTeam.id);
    const result = (0, match_simulator_1.simulateMatch)(homeTeamData, awayTeamData, seed);
    await handleMatchCompletion(app, { ...match, awayUserId: userId, awayTeamId: myTeam.id }, result, seed);
    return {
        match: await app.prisma.match.findUnique({
            where: { id: matchId },
            include: {
                homeUser: true,
                awayUser: true,
            },
        }),
        result,
        rewards: {
            coins: result.winner === "away"
                ? constants_1.MATCH.REWARDS.WIN_COINS
                : constants_1.MATCH.REWARDS.LOSS_COINS,
            exp: result.winner === "away"
                ? constants_1.MATCH.REWARDS.WIN_EXP
                : constants_1.MATCH.REWARDS.LOSS_EXP,
        },
        isBot: false,
    };
}
async function getMatchById(app, matchId) {
    const match = await app.prisma.match.findUnique({
        where: { id: matchId },
        include: {
            homeTeam: true,
            awayTeam: true,
            homeUser: true,
            awayUser: true,
            events: {
                orderBy: { minute: "asc" },
            },
        },
    });
    if (!match)
        return null;
    let result = null;
    if (match.status === "COMPLETED") {
        result = {
            homeScore: match.homeScore || 0,
            awayScore: match.awayScore || 0,
            winner: (match.homeScore || 0) > (match.awayScore || 0)
                ? "home"
                : (match.awayScore || 0) > (match.homeScore || 0)
                    ? "away"
                    : "draw",
            events: match.events.map((e) => {
                let type = e.type.toLowerCase();
                if (type === "yellow_card")
                    type = "yellowCard";
                if (type === "red_card")
                    type = "redCard";
                if (type === "tactic_change")
                    type = "tacticChange";
                return {
                    minute: e.minute,
                    type,
                    team: e.team,
                    playerId: e.playerId,
                    playerName: e.playerName,
                    description: e.description,
                };
            }),
        };
    }
    return { match, result };
}
async function cancelMatchmaking(app, userId) {
    const match = await app.prisma.match.findFirst({
        where: {
            homeUserId: userId,
            status: "PENDING",
            type: "FRIENDLY",
            createdAt: { gte: new Date(Date.now() - 60000) },
        },
    });
    if (match) {
        await app.prisma.match.update({
            where: { id: match.id },
            data: { status: "CANCELLED" },
        });
        return { success: true };
    }
    return { success: false, message: "No active matchmaking found" };
}
async function getMatchHistory(app, userId, limit = 20) {
    return app.prisma.match.findMany({
        where: {
            OR: [{ homeUserId: userId }, { awayUserId: userId }],
            status: "COMPLETED",
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
            homeTeam: true,
            awayTeam: true,
            events: {
                orderBy: { minute: "asc" },
            },
        },
    });
}
