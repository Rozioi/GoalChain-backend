"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playFriendlyMatch = playFriendlyMatch;
exports.playBotMatch = playBotMatch;
exports.updateMatchTactics = updateMatchTactics;
exports.inviteFriend = inviteFriend;
exports.acceptMatch = acceptMatch;
exports.getMatchHistory = getMatchHistory;
const crypto_1 = require("crypto");
const match_simulator_1 = require("./match.simulator");
const bot_generator_1 = require("./bot.generator");
const constants_1 = require("../../config/constants");
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
        ovr: tp.player.ovr,
        pace: tp.player.pace,
        shooting: tp.player.shooting,
        passing: tp.player.passing,
        dribbling: tp.player.dribbling,
        defending: tp.player.defending,
        physical: tp.player.physical,
        goalkeeping: tp.player.goalkeeping,
        form: tp.player.form,
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
    // Check daily limit
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
    // Get user's team
    const myTeam = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
    });
    if (!myTeam)
        throw new Error("No team found. Complete the draft first.");
    // Logic: Lobbies via PENDING matches
    // 1. Try to find an existing pending lobby
    const existingLobby = await app.prisma.match.findFirst({
        where: {
            type: "FRIENDLY",
            status: "PENDING",
            awayUserId: null,
            homeUserId: { not: userId },
            // Optional: check rating difference here
        },
        orderBy: { createdAt: "asc" },
    });
    if (existingLobby) {
        console.log(`Matchmaking: User ${userId} joining existing lobby ${existingLobby.id}`);
        // We are the AWAY player joining an existing lobby
        const seed = (0, crypto_1.randomUUID)();
        const homeTeamData = await getTeamForMatch(app, existingLobby.homeTeamId);
        const awayTeamData = await getTeamForMatch(app, myTeam.id);
        const result = (0, match_simulator_1.simulateMatch)(homeTeamData, awayTeamData, seed);
        // Calculate rewards for HOME (original creator)
        const homeUser = await app.prisma.user.findUnique({ where: { id: existingLobby.homeUserId } });
        const homeMatchNumber = (homeUser?.dailyMatchesPlayed || 0) + 1;
        const homeDiminish = Math.pow(constants_1.MATCH.REWARDS.DIMINISHING_FACTOR, homeMatchNumber - 1);
        let homeCoins = 0;
        let homeExp = 0;
        if (result.winner === "home") {
            homeCoins = Math.floor(constants_1.MATCH.REWARDS.WIN_COINS * homeDiminish);
            homeExp = Math.floor(constants_1.MATCH.REWARDS.WIN_EXP * homeDiminish);
        }
        else if (result.winner === "draw") {
            homeCoins = Math.floor(constants_1.MATCH.REWARDS.DRAW_COINS * homeDiminish);
            homeExp = Math.floor(constants_1.MATCH.REWARDS.DRAW_EXP * homeDiminish);
        }
        else {
            homeCoins = Math.floor(constants_1.MATCH.REWARDS.LOSS_COINS * homeDiminish);
            homeExp = Math.floor(constants_1.MATCH.REWARDS.LOSS_EXP * homeDiminish);
        }
        // Calculate rewards for AWAY (us)
        const awayMatchNumber = user.dailyMatchesPlayed + 1;
        const awayDiminish = Math.pow(constants_1.MATCH.REWARDS.DIMINISHING_FACTOR, awayMatchNumber - 1);
        let awayCoins = 0;
        let awayExp = 0;
        if (result.winner === "away") {
            awayCoins = Math.floor(constants_1.MATCH.REWARDS.WIN_COINS * awayDiminish);
            awayExp = Math.floor(constants_1.MATCH.REWARDS.WIN_EXP * awayDiminish);
        }
        else if (result.winner === "draw") {
            awayCoins = Math.floor(constants_1.MATCH.REWARDS.DRAW_COINS * awayDiminish);
            awayExp = Math.floor(constants_1.MATCH.REWARDS.DRAW_EXP * awayDiminish);
        }
        else {
            awayCoins = Math.floor(constants_1.MATCH.REWARDS.LOSS_COINS * awayDiminish);
            awayExp = Math.floor(constants_1.MATCH.REWARDS.LOSS_EXP * awayDiminish);
        }
        // Update match to COMPLETED
        const match = await app.prisma.match.update({
            where: { id: existingLobby.id },
            data: {
                status: "COMPLETED",
                awayUserId: userId,
                awayTeamId: myTeam.id,
                homeScore: result.homeScore,
                awayScore: result.awayScore,
                seed,
                overtime: result.overtime,
                homePressingType: homeTeamData.pressingType,
                awayPressingType: awayTeamData.pressingType,
                homeCoins,
                awayCoins,
                homeExp,
                awayExp,
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
            include: {
                homeTeam: { select: { name: true } },
                awayTeam: { select: { name: true } },
            }
        });
        // Award rewards to BOTH
        await app.prisma.user.update({
            where: { id: existingLobby.homeUserId },
            data: {
                coins: { increment: homeCoins },
                reputation: { increment: homeExp },
                dailyMatchesPlayed: { increment: 1 },
            },
        });
        await app.prisma.user.update({
            where: { id: userId },
            data: {
                coins: { increment: awayCoins },
                reputation: { increment: awayExp },
                dailyMatchesPlayed: { increment: 1 },
            },
        });
        return {
            match,
            result,
            rewards: { coins: awayCoins, exp: awayExp },
            isBot: false,
        };
    }
    else {
        // 2. No lobby found — create our own
        console.log(`Matchmaking: User ${userId} creating new lobby`);
        // Find or create a bot team to use as a placeholder for the required awayTeamId
        let botUser = await app.prisma.user.findUnique({ where: { telegramId: "bot-system" } });
        if (!botUser) {
            botUser = await app.prisma.user.create({
                data: {
                    telegramId: "bot-system",
                    username: "bot_system",
                    firstName: "Bot",
                    lastName: "System",
                    referralCode: "BOT-SYSTEM-PLACEHOLDER",
                },
            });
        }
        let botTeam = await app.prisma.team.findFirst({ where: { userId: botUser.id } });
        if (!botTeam) {
            botTeam = await app.prisma.team.create({
                data: {
                    name: "System Placeholder Team",
                    userId: botUser.id,
                    rating: 50,
                },
            });
        }
        const myLobby = await app.prisma.match.create({
            data: {
                type: "FRIENDLY",
                status: "PENDING",
                homeUserId: userId,
                homeTeamId: myTeam.id,
                awayTeamId: botTeam.id, // Using bot team as placeholder
            }
        });
        const waitStart = Date.now();
        const timeout = 12000; // Wait up to 12 seconds
        while (Date.now() - waitStart < timeout) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const updatedMatch = await app.prisma.match.findUnique({
                where: { id: myLobby.id },
                include: {
                    events: { orderBy: { minute: "asc" } },
                    homeTeam: { select: { name: true } },
                    awayTeam: { select: { name: true } },
                }
            });
            if (updatedMatch && updatedMatch.status === "COMPLETED" && updatedMatch.awayUserId) {
                console.log(`Matchmaking: User ${userId}'s lobby matched with ${updatedMatch.awayUserId}!`);
                const result = {
                    homeScore: updatedMatch.homeScore,
                    awayScore: updatedMatch.awayScore,
                    winner: updatedMatch.homeScore > updatedMatch.awayScore ? 'home' : (updatedMatch.awayScore > updatedMatch.homeScore ? 'away' : 'draw'),
                    events: updatedMatch.events.map(e => ({
                        minute: e.minute,
                        type: e.type.toLowerCase(),
                        team: e.team,
                        playerId: e.playerId,
                        playerName: e.playerName,
                        description: e.description
                    })),
                    overtime: updatedMatch.overtime
                };
                return {
                    match: updatedMatch,
                    result,
                    rewards: { coins: updatedMatch.homeCoins, exp: updatedMatch.homeExp },
                    isBot: false,
                };
            }
        }
        // 3. Timeout — cancel lobby
        console.log(`Matchmaking: User ${userId} lobby timed out.`);
        await app.prisma.match.update({
            where: { id: myLobby.id },
            data: { status: "CANCELLED" }
        });
        throw new Error("OPPONENT_NOT_FOUND");
    }
}
async function playBotMatch(app, userId) {
    // Check daily limit
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
    // Get user's team
    const myTeam = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
    });
    if (!myTeam)
        throw new Error("No team found");
    // Generate bot team
    const botResult = await (0, bot_generator_1.generateBotTeam)(app, myTeam.rating);
    const opponentTeamId = botResult.team.id;
    // Simulate match
    const seed = (0, crypto_1.randomUUID)();
    const homeTeamData = await getTeamForMatch(app, myTeam.id);
    const awayTeamData = await getTeamForMatch(app, opponentTeamId);
    const result = (0, match_simulator_1.simulateMatch)(homeTeamData, awayTeamData, seed);
    // Calculate rewards
    const matchNumber = user.dailyMatchesPlayed + 1;
    const diminish = Math.pow(constants_1.MATCH.REWARDS.DIMINISHING_FACTOR, matchNumber - 1);
    let homeCoins;
    let homeExp;
    if (result.winner === "home") {
        homeCoins = Math.floor(constants_1.MATCH.REWARDS.WIN_COINS * diminish);
        homeExp = Math.floor(constants_1.MATCH.REWARDS.WIN_EXP * diminish);
    }
    else if (result.winner === "draw") {
        homeCoins = Math.floor(constants_1.MATCH.REWARDS.DRAW_COINS * diminish);
        homeExp = Math.floor(constants_1.MATCH.REWARDS.DRAW_EXP * diminish);
    }
    else {
        homeCoins = Math.floor(constants_1.MATCH.REWARDS.LOSS_COINS * diminish);
        homeExp = Math.floor(constants_1.MATCH.REWARDS.LOSS_EXP * diminish);
    }
    // Save match
    const match = await app.prisma.match.create({
        data: {
            type: "FRIENDLY",
            status: "COMPLETED",
            homeUserId: userId,
            awayUserId: null,
            homeTeamId: myTeam.id,
            awayTeamId: opponentTeamId,
            isBot: true,
            homeScore: result.homeScore,
            awayScore: result.awayScore,
            seed,
            overtime: result.overtime,
            homePressingType: homeTeamData.pressingType,
            awayPressingType: awayTeamData.pressingType,
            homeCoins,
            awayCoins: 0,
            homeExp,
            awayExp: 0,
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
        include: {
            homeTeam: { select: { name: true } },
            awayTeam: { select: { name: true } },
        }
    });
    // Award rewards
    await app.prisma.user.update({
        where: { id: userId },
        data: {
            coins: { increment: homeCoins },
            reputation: { increment: homeExp },
            dailyMatchesPlayed: { increment: 1 },
        },
    });
    return {
        match,
        result,
        rewards: { coins: homeCoins, exp: homeExp },
        isBot: true,
    };
}
async function updateMatchTactics(app, matchId, userId, tactics) {
    const match = await app.prisma.match.findUnique({
        where: { id: matchId },
        include: { events: true }
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
    // Determine current minute based on existing events
    const lastEvent = match.events.length > 0
        ? match.events.reduce((max, e) => e.minute > max.minute ? e : max, match.events[0])
        : null;
    const currentMinute = lastEvent ? Math.min(lastEvent.minute + 1, 90) : 1;
    // Record tactical change event
    const tacticEvent = await app.prisma.matchEvent.create({
        data: {
            matchId,
            minute: currentMinute,
            team,
            type: tactics.pressingType ? "TACTIC_CHANGE" : "SUBSTITUTION",
            description: tactics.pressingType
                ? `Tactical change: Team switched to ${tactics.pressingType} pressing.`
                : tactics.substitution
                    ? `Manual substitution requested.`
                    : "Tactical adjustment made."
        }
    });
    // Update match record if pressing type changed
    if (tactics.pressingType) {
        await app.prisma.match.update({
            where: { id: matchId },
            data: isHome ? { homePressingType: tactics.pressingType } : { awayPressingType: tactics.pressingType }
        });
    }
    // Gather all PREVIOUS tactical changes and substitutions from event history
    const allEvents = [...match.events, tacticEvent];
    const pressingChanges = [];
    const manualSubstitutions = [];
    const lockedEvents = [];
    for (const e of allEvents) {
        if (e.type === "TACTIC_CHANGE" && e.description.includes("pressing")) {
            const type = e.description.split(" ").slice(-2, -1)[0];
            pressingChanges.push({ minute: e.minute, team: e.team, type });
        }
        else if (e.type === "SUBSTITUTION" || e.description.includes("substitution")) {
            // Note: In a full implementation, we'd store outId/inId in JSON rules or separate fields
            // For now, we assume current manual sub is the one being added
        }
        // Lock all "non-tactical" events that already happened
        if (e.minute < currentMinute && !["TACTIC_CHANGE", "SUBSTITUTION"].includes(e.type)) {
            lockedEvents.push({
                minute: e.minute,
                type: e.type.toLowerCase(),
                team: e.team,
                playerId: e.playerId,
                playerName: e.playerName,
                description: e.description
            });
        }
    }
    if (tactics.substitution) {
        manualSubstitutions.push({
            minute: currentMinute,
            team,
            outId: tactics.substitution.outId,
            inId: tactics.substitution.inId
        });
    }
    // RE-SIMULATE: Fetch updated data and re-run simulation from seed
    const homeTeamData = await getTeamForMatch(app, match.homeTeamId);
    const awayTeamData = await getTeamForMatch(app, match.awayTeamId);
    // Sync pressing types from match record (which was just updated)
    homeTeamData.pressingType = match.homePressingType;
    awayTeamData.pressingType = match.awayPressingType;
    const result = (0, match_simulator_1.simulateMatch)(homeTeamData, awayTeamData, match.seed, {
        pressingChanges,
        manualSubstitutions,
        lockedEvents,
        skipUntilMinute: currentMinute
    });
    // Update match result and events (REPLACE future events)
    await app.prisma.matchEvent.deleteMany({
        where: {
            matchId,
            minute: { gte: currentMinute },
            id: { not: tacticEvent.id } // Keep the trigger event
        }
    });
    await app.prisma.match.update({
        where: { id: matchId },
        data: {
            homeScore: result.homeScore,
            awayScore: result.awayScore,
            events: {
                create: result.events
                    .filter(e => e.minute >= currentMinute && e.description !== tacticEvent.description)
                    .map((e) => ({
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
    return { result };
}
async function inviteFriend(app, userId, friendTelegramId) {
    const myTeam = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
    });
    if (!myTeam)
        throw new Error("No team found");
    // Find friend
    const friend = await app.prisma.user.findUnique({
        where: { telegramId: friendTelegramId },
    });
    if (!friend)
        throw new Error("Friend not found");
    const friendTeam = await app.prisma.team.findFirst({
        where: { userId: friend.id, isEvent: false },
    });
    if (!friendTeam)
        throw new Error("Friend has no team");
    // Create pending match
    const match = await app.prisma.match.create({
        data: {
            type: "FRIENDLY",
            status: "PENDING",
            homeUserId: userId,
            awayUserId: friend.id,
            homeTeamId: myTeam.id,
            awayTeamId: friendTeam.id,
        },
    });
    return {
        matchId: match.id,
        inviteLink: `https://t.me/your_bot?start=match_${match.id}`,
    };
}
async function acceptMatch(app, userId, matchId) {
    const match = await app.prisma.match.findUnique({
        where: { id: matchId },
    });
    if (!match)
        throw new Error("Match not found");
    if (match.status !== "PENDING")
        throw new Error("Match already started");
    if (match.awayUserId !== userId)
        throw new Error("Not your match invitation");
    const seed = (0, crypto_1.randomUUID)();
    const homeTeamData = await getTeamForMatch(app, match.homeTeamId);
    const awayTeamData = await getTeamForMatch(app, match.awayTeamId);
    const result = (0, match_simulator_1.simulateMatch)(homeTeamData, awayTeamData, seed);
    await app.prisma.match.update({
        where: { id: matchId },
        data: {
            status: "COMPLETED",
            homeScore: result.homeScore,
            awayScore: result.awayScore,
            seed,
            homeCoins: result.winner === "home" ? constants_1.MATCH.REWARDS.WIN_COINS : constants_1.MATCH.REWARDS.LOSS_COINS,
            awayCoins: result.winner === "away" ? constants_1.MATCH.REWARDS.WIN_COINS : constants_1.MATCH.REWARDS.LOSS_COINS,
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
    // Award coins to both players
    if (match.homeUserId) {
        await app.prisma.user.update({
            where: { id: match.homeUserId },
            data: {
                coins: {
                    increment: result.winner === "home"
                        ? constants_1.MATCH.REWARDS.WIN_COINS
                        : result.winner === "draw"
                            ? constants_1.MATCH.REWARDS.DRAW_COINS
                            : constants_1.MATCH.REWARDS.LOSS_COINS,
                },
            },
        });
    }
    await app.prisma.user.update({
        where: { id: userId },
        data: {
            coins: {
                increment: result.winner === "away"
                    ? constants_1.MATCH.REWARDS.WIN_COINS
                    : result.winner === "draw"
                        ? constants_1.MATCH.REWARDS.DRAW_COINS
                        : constants_1.MATCH.REWARDS.LOSS_COINS,
            },
        },
    });
    return { match: { ...match, homeScore: result.homeScore, awayScore: result.awayScore }, result };
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
