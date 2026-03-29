import { FastifyInstance } from "fastify";
import { randomUUID } from "crypto";
import { simulateMatch, PressingType } from "./match.simulator";
import { generateBotTeam } from "./bot.generator";
import { MATCH } from "../../config/constants";
import { updateTaskProgress } from "../task/task.service";

async function getTeamForMatch(app: FastifyInstance, teamId: string) {
  const team = await app.prisma.team.findUnique({
    where: { id: teamId },
    include: {
      players: {
        include: { player: true },
      },
    },
  });

  if (!team) throw new Error("Team not found");

  const mapPlayer = (tp: any) => ({
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
    starters: team.players.filter((tp: any) => tp.isStarter).map(mapPlayer),
    bench: team.players.filter((tp: any) => !tp.isStarter).map(mapPlayer),
    pressingType: "MEDIUM" as PressingType,
  };
}

export async function playFriendlyMatch(
  app: FastifyInstance,
  userId: string,
) {
  // Check daily limit
  const user = await app.prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (user.dailyMatchesResetAt < today) {
    await app.prisma.user.update({
      where: { id: userId },
      data: { dailyMatchesPlayed: 0, dailyMatchesResetAt: new Date() },
    });
  } else if (user.dailyMatchesPlayed >= MATCH.DAILY_FRIENDLY_LIMIT) {
    throw new Error(
      `Daily match limit reached (${MATCH.DAILY_FRIENDLY_LIMIT})`,
    );
  }

  // Get user's team
  const myTeam = await app.prisma.team.findFirst({
    where: { userId, isEvent: false },
  });
  if (!myTeam) throw new Error("No team found. Complete the draft first.");

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
    const seed = randomUUID();
    const homeTeamData = await getTeamForMatch(app, existingLobby.homeTeamId);
    const awayTeamData = await getTeamForMatch(app, myTeam.id);
    const result = simulateMatch(homeTeamData, awayTeamData, seed);

    // Calculate rewards for AWAY (us) based on our daily limit
    const awayMatchNumber = user.dailyMatchesPlayed + 1;
    const awayDiminish = Math.pow(MATCH.REWARDS.DIMINISHING_FACTOR, awayMatchNumber - 1);
    
    // 1. Update match record and award rewards via helper
    await handleMatchCompletion(app, existingLobby, result, seed);

    // 2. Update daily match counts
    await app.prisma.user.updateMany({
      where: { id: { in: [existingLobby.homeUserId!, userId] } },
      data: { dailyMatchesPlayed: { increment: 1 } }
    });

    return {
      match: { ...existingLobby, homeScore: result.homeScore, awayScore: result.awayScore },
      result,
      rewards: { 
        coins: result.winner === "away" 
          ? Math.floor(MATCH.REWARDS.WIN_COINS * awayDiminish) 
          : result.winner === "draw" 
            ? Math.floor(MATCH.REWARDS.DRAW_COINS * awayDiminish) 
            : Math.floor(MATCH.REWARDS.LOSS_COINS * awayDiminish),
        exp: result.winner === "away"
          ? Math.floor(MATCH.REWARDS.WIN_EXP * awayDiminish)
          : result.winner === "draw"
            ? Math.floor(MATCH.REWARDS.DRAW_EXP * awayDiminish)
            : Math.floor(MATCH.REWARDS.LOSS_EXP * awayDiminish)
      },
      isBot: false,
    };
  } else {
    // 2. No lobby found — create our own
    console.log(`Matchmaking: User ${userId} creating new lobby`);
    
    // Find or create a bot team placeholder
    const botUser = await app.prisma.user.upsert({
      where: { telegramId: "bot-system" },
      update: {},
      create: {
        telegramId: "bot-system",
        username: "bot_system",
        firstName: "Bot",
        lastName: "System",
        referralCode: "BOT-SYSTEM-" + randomUUID().slice(0, 8),
      }
    });
    
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
        awayTeamId: botTeam.id,
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
        }
      });

      if (updatedMatch && updatedMatch.status === "COMPLETED" && updatedMatch.awayUserId) {
        return {
          match: updatedMatch,
          result: {
            homeScore: updatedMatch.homeScore!,
            awayScore: updatedMatch.awayScore!,
            winner: updatedMatch.homeScore! > updatedMatch.awayScore! ? 'home' : (updatedMatch.awayScore! > updatedMatch.homeScore! ? 'away' : 'draw'),
            events: updatedMatch.events.map(e => ({
              minute: e.minute,
              type: e.type.toLowerCase(),
              team: e.team,
              playerId: e.playerId,
              playerName: e.playerName,
              description: e.description
            })),
          },
          rewards: { coins: updatedMatch.homeCoins, exp: updatedMatch.homeExp },
          isBot: false,
        };
      }
    }

    // 3. Timeout — play against bot
    console.log(`Matchmaking: User ${userId} lobby timed out. Falling back to bot.`);
    await app.prisma.match.update({
      where: { id: myLobby.id },
      data: { status: "CANCELLED" }
    });
    
    return playBotMatch(app, userId);
  }
}

export async function playBotMatch(
  app: FastifyInstance,
  userId: string,
) {
  const user = await app.prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (user.dailyMatchesResetAt < today) {
    await app.prisma.user.update({
      where: { id: userId },
      data: { dailyMatchesPlayed: 0, dailyMatchesResetAt: new Date() },
    });
  } else if (user.dailyMatchesPlayed >= MATCH.DAILY_FRIENDLY_LIMIT) {
    throw new Error(`Daily match limit reached (${MATCH.DAILY_FRIENDLY_LIMIT})`);
  }

  const myTeam = await app.prisma.team.findFirst({ where: { userId, isEvent: false } });
  if (!myTeam) throw new Error("No team found");

  const botResult = await generateBotTeam(app, myTeam.rating);
  const seed = randomUUID();
  const homeTeamData = await getTeamForMatch(app, myTeam.id);
  const awayTeamData = await getTeamForMatch(app, botResult.team.id);
  const result = simulateMatch(homeTeamData, awayTeamData, seed);

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
    }
  });

  await handleMatchCompletion(app, match, result, seed);

  await app.prisma.user.update({
    where: { id: userId },
    data: { dailyMatchesPlayed: { increment: 1 } }
  });

  return {
    match,
    result,
    rewards: { 
      coins: result.winner === "home" ? MATCH.REWARDS.WIN_COINS : MATCH.REWARDS.LOSS_COINS,
      exp: result.winner === "home" ? MATCH.REWARDS.WIN_EXP : MATCH.REWARDS.LOSS_EXP
    },
    isBot: true,
  };
}

export async function updateMatchTactics(
  app: FastifyInstance,
  matchId: string,
  userId: string,
  tactics: {
    pressingType?: "SOFT" | "MEDIUM" | "INTENSIVE";
    substitution?: { outId: string, inId: string };
  }
) {
  const match = await app.prisma.match.findUnique({
    where: { id: matchId },
    include: { events: true }
  });

  if (!match) throw new Error("Match not found");
  if (match.status !== "IN_PROGRESS" && match.status !== "COMPLETED") throw new Error("Match not active");

  const isHome = match.homeUserId === userId;
  const isAway = match.awayUserId === userId;
  if (!isHome && !isAway) throw new Error("Not your match");

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
  const pressingChanges: any[] = [];
  const manualSubstitutions: any[] = [];
  const lockedEvents: any[] = [];

  for (const e of allEvents) {
    if (e.type === "TACTIC_CHANGE" && e.description.includes("switching to")) {
      const parts = e.description.split(" ");
      const type = parts[parts.length - 2] as any;
      pressingChanges.push({ minute: e.minute, team: e.team, type });
    } else if (e.type === "TACTIC_CHANGE" && e.description.includes("switched to")) {
      const parts = e.description.split(" ");
      const type = parts[parts.length - 2] as any; // "switched", "to", "INTENSIVE", "pressing."
      pressingChanges.push({ minute: e.minute, team: e.team, type });
    } else if (e.type === "SUBSTITUTION" || e.description.includes("substitution")) {
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

  const result = simulateMatch(homeTeamData, awayTeamData, match.seed!, {
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
          .map((e: any) => ({
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

export async function inviteFriend(
  app: FastifyInstance,
  userId: string,
  friendTelegramId: string,
) {
  const myTeam = await app.prisma.team.findFirst({
    where: { userId, isEvent: false },
  });
  if (!myTeam) throw new Error("No team found");

  // Find friend
  const friend = await app.prisma.user.findUnique({
    where: { telegramId: friendTelegramId },
  });
  if (!friend) throw new Error("Friend not found");

  const friendTeam = await app.prisma.team.findFirst({
    where: { userId: friend.id, isEvent: false },
  });
  if (!friendTeam) throw new Error("Friend has no team");

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

async function handleMatchCompletion(
  app: FastifyInstance,
  match: any,
  result: any,
  seed: string
) {
  // 1. Update match record
  await app.prisma.match.update({
    where: { id: match.id },
    data: {
      status: "COMPLETED",
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      seed,
      homeCoins: result.winner === "home" ? MATCH.REWARDS.WIN_COINS : MATCH.REWARDS.LOSS_COINS,
      awayCoins: result.winner === "away" ? MATCH.REWARDS.WIN_COINS : MATCH.REWARDS.LOSS_COINS,
      events: {
        create: result.events.map((e: any) => ({
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

  // 2. Award coins & reputation (if not already awarded)
  const homeId = match.homeUserId;
  const awayId = match.awayUserId;

  const updatePlayer = async (uid: string, role: "home" | "away") => {
    const coins = result.winner === role
      ? MATCH.REWARDS.WIN_COINS
      : result.winner === "draw"
        ? MATCH.REWARDS.DRAW_COINS
        : MATCH.REWARDS.LOSS_COINS;

    const exp = result.winner === role
      ? 100
      : result.winner === "draw"
        ? 40
        : 20;

    const points = result.winner === role
      ? 25
      : result.winner === "draw"
        ? 10
        : -15;

    // Get current user to check level
    const user = await app.prisma.user.findUnique({ where: { id: uid } });
    if (!user) return;

    let newExp = (user as any).experience + exp;
    let newLevel = (user as any).level;
    const newPoints = Math.max(0, (user as any).points + points);

    // Level formula: level * 500
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
      } as any,
    });

    // 3. Update Tasks
    await updateTaskProgress(app, uid, "MATCHES", 1);
    
    if (result.winner === role) {
      await updateTaskProgress(app, uid, "WINS", 1);
    }
    
    const userScore = role === "home" ? result.homeScore : result.awayScore;
    const opponentScore = role === "home" ? result.awayScore : result.homeScore;
    
    if (userScore > 0) {
      await updateTaskProgress(app, uid, "GOALS", userScore);
    }
    
    if (opponentScore === 0) {
      await updateTaskProgress(app, uid, "CLEAN_SHEETS", 1);
    }
  };

  if (homeId) await updatePlayer(homeId, "home");
  if (awayId) await updatePlayer(awayId, "away");

  return { homeRewards: { coins: result.winner === "home" ? MATCH.REWARDS.WIN_COINS : MATCH.REWARDS.LOSS_COINS } };
}

export async function acceptMatch(
  app: FastifyInstance,
  userId: string,
  matchId: string,
) {
  const match = await app.prisma.match.findUnique({
    where: { id: matchId },
  });

  if (!match) throw new Error("Match not found");
  if (match.status !== "PENDING") throw new Error("Match already started");
  if (match.awayUserId !== userId) throw new Error("Not your match invitation");

  const seed = randomUUID();
  const homeTeamData = await getTeamForMatch(app, match.homeTeamId);
  const awayTeamData = await getTeamForMatch(app, match.awayTeamId);

  const result = simulateMatch(homeTeamData, awayTeamData, seed);

  await handleMatchCompletion(app, match, result, seed);

  return { result };
}

export async function getMatchHistory(
  app: FastifyInstance,
  userId: string,
  limit = 20,
) {
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
