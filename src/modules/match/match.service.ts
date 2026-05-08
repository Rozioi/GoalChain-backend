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
    starters: team.players.filter((tp: any) => tp.isStarter).map(mapPlayer),
    bench: team.players.filter((tp: any) => !tp.isStarter).map(mapPlayer),
    pressingType: "MEDIUM" as PressingType,
  };
}
export async function playFriendlyMatch(app: FastifyInstance, userId: string) {
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
  // 0. Check if we already HAVE an active pending lobby to prevent double-matchmaking
  const myExistingLobby = await app.prisma.match.findFirst({
    where: {
      type: "FRIENDLY",
      status: "PENDING",
      homeUserId: userId,
      createdAt: { gte: new Date(Date.now() - 30000) },
    },
  });

    // Re-run the wait loop for this existing lobby
    return waitForOpponent(app, userId, myExistingLobby);

  // 1. Try to find an existing pending lobby from OTHER users
  const existingLobby = await app.prisma.match.findFirst({
    where: {
      type: "FRIENDLY",
      status: "PENDING",
      awayUserId: null,
      homeUserId: { not: userId },
    },
    orderBy: { createdAt: "asc" },
  });

  if (existingLobby) {

    // We are the AWAY player joining an existing lobby
    const seed = randomUUID();
    const homeTeamData = await getTeamForMatch(app, existingLobby.homeTeamId);
    const awayTeamData = await getTeamForMatch(app, myTeam.id);
    const result = simulateMatch(homeTeamData, awayTeamData, seed);

    // Update existingLobby locally and in DB so home user looping picks it up
    existingLobby.awayUserId = userId;
    existingLobby.awayTeamId = myTeam.id;
    await app.prisma.match.update({
      where: { id: existingLobby.id },
      data: { awayUserId: userId, awayTeamId: myTeam.id },
    });

    // Calculate rewards for AWAY (us) based on our daily limit
    const awayMatchNumber = user.dailyMatchesPlayed + 1;
    const awayDiminish = Math.pow(
      MATCH.REWARDS.DIMINISHING_FACTOR,
      awayMatchNumber - 1,
    );

    // 1. Update match record and award rewards via helper
    await handleMatchCompletion(app, existingLobby, result, seed);

    // 2. Update daily match counts
    await app.prisma.user.updateMany({
      where: { id: { in: [existingLobby.homeUserId!, userId] } },
      data: { dailyMatchesPlayed: { increment: 1 } },
    });

    return {
      match: {
        ...existingLobby,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
      },
      result,
      rewards: {
        coins:
          result.winner === "away"
            ? Math.floor(MATCH.REWARDS.WIN_COINS * awayDiminish)
            : result.winner === "draw"
              ? Math.floor(MATCH.REWARDS.DRAW_COINS * awayDiminish)
              : Math.floor(MATCH.REWARDS.LOSS_COINS * awayDiminish),
        exp:
          result.winner === "away"
            ? Math.floor(MATCH.REWARDS.WIN_EXP * awayDiminish)
            : result.winner === "draw"
              ? Math.floor(MATCH.REWARDS.DRAW_EXP * awayDiminish)
              : Math.floor(MATCH.REWARDS.LOSS_EXP * awayDiminish),
      },
      isBot: false,
    };
  } else {
    // 2. No lobby found — create our own

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

    const myLobby = await app.prisma.match.create({
      data: {
        type: "FRIENDLY",
        status: "PENDING",
        homeUserId: userId,
        homeTeamId: myTeam.id,
        awayTeamId: botTeam.id,
      },
    });

    return waitForOpponent(app, userId, myLobby);
  }
}

async function waitForOpponent(
  app: FastifyInstance,
  userId: string,
  lobby: any,
) {
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

    if (
      updatedMatch &&
      updatedMatch.status === "COMPLETED" &&
      updatedMatch.awayUserId
    ) {
      return {
        match: updatedMatch,
        result: {
          homeScore: updatedMatch.homeScore!,
          awayScore: updatedMatch.awayScore!,
          winner:
            updatedMatch.homeScore! > updatedMatch.awayScore!
              ? "home"
              : updatedMatch.awayScore! > updatedMatch.homeScore!
                ? "away"
                : "draw",
          events: updatedMatch.events.map((e) => ({
            minute: e.minute,
            type: e.type.toLowerCase(),
            team: e.team,
            playerId: e.playerId,
            playerName: e.playerName,
            description: e.description,
          })),
        },
        rewards: { coins: updatedMatch.homeCoins, exp: updatedMatch.homeExp },
        isBot: false,
      };
    }
  }

  // 3. Timeout — play against bot

  // Verify match hasn't been completed at the very last second
  const finalCheck = await app.prisma.match.findUnique({
    where: { id: lobby.id },
  });
  if (finalCheck?.status === "COMPLETED") return playBotMatch(app, userId); // Should technically return the match but bot is safe fallback

  await app.prisma.match.update({
    where: { id: lobby.id },
    data: { status: "CANCELLED" },
  });

  return playBotMatch(app, userId);
}

export async function playBotMatch(app: FastifyInstance, userId: string) {
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

  const myTeam = await app.prisma.team.findFirst({
    where: { userId, isEvent: false },
  });
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
      coins:
        result.winner === "home"
          ? MATCH.REWARDS.WIN_COINS
          : MATCH.REWARDS.LOSS_COINS,
      exp:
        result.winner === "home"
          ? MATCH.REWARDS.WIN_EXP
          : MATCH.REWARDS.LOSS_EXP,
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
    substitutions?: { outId: string; inId: string }[];
  },
) {
  const match = await app.prisma.match.findUnique({
    where: { id: matchId },
    include: { events: true },
  });

  if (!match) throw new Error("Match not found");
  if (match.status !== "IN_PROGRESS" && match.status !== "COMPLETED")
    throw new Error("Match not active");

  const isHome = match.homeUserId === userId;
  const isAway = match.awayUserId === userId;
  if (!isHome && !isAway) throw new Error("Not your match");

  const team = isHome ? "home" : "away";

  // Determine current minute based on existing events
  const lastEvent =
    match.events.length > 0
      ? match.events.reduce(
          (max, e) => (e.minute > max.minute ? e : max),
          match.events[0],
        )
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
        : tactics.substitutions && tactics.substitutions.length > 0
          ? `Manual substitution(s) requested.`
          : "Tactical adjustment made.",
    },
  });

  // Update match record if pressing type changed
  if (tactics.pressingType) {
    await app.prisma.match.update({
      where: { id: matchId },
      data: isHome
        ? { homePressingType: tactics.pressingType }
        : { awayPressingType: tactics.pressingType },
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
    } else if (
      e.type === "TACTIC_CHANGE" &&
      e.description.includes("switched to")
    ) {
      const parts = e.description.split(" ");
      const type = parts[parts.length - 2] as any; // "switched", "to", "INTENSIVE", "pressing."
      pressingChanges.push({ minute: e.minute, team: e.team, type });
    } else if (
      e.type === "SUBSTITUTION" ||
      e.description.includes("substitution")
    ) {
      // Logic for retrieving previous manual subs from description if needed
      // For now we assume the current call adds the newest batch
    }

    // Lock all "non-tactical" events that already happened
    if (
      e.minute < currentMinute &&
      !["TACTIC_CHANGE", "SUBSTITUTION"].includes(e.type)
    ) {
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
    skipUntilMinute: currentMinute,
  });

  // Update match result and events (REPLACE future events)
  await app.prisma.matchEvent.deleteMany({
    where: {
      matchId,
      minute: { gte: currentMinute },
      id: { not: tacticEvent.id }, // Keep the trigger event
    },
  });

  await app.prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      events: {
        create: result.events
          .filter(
            (e) =>
              e.minute >= currentMinute &&
              e.description !== tacticEvent.description,
          )
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
      type: "CHALLENGE",
      status: "PENDING",
      homeUserId: userId,
      awayUserId: friend.id,
      homeTeamId: myTeam.id,
      awayTeamId: friendTeam.id,
    },
  });

  return {
    matchId: match.id,
    inviteLink: `https://t.me/hdixhrjidj_bot/startapp?startapp=challenge_${match.id}`,
  };
}

export async function createOpenChallenge(
  app: FastifyInstance,
  userId: string,
) {
  const myTeam = await app.prisma.team.findFirst({
    where: { userId, isEvent: false },
  });
  if (!myTeam) throw new Error("No team found");

  // Create pending match without an away user
  // Using bot team as a temporary placeholder for awayTeamId because it's required
  const botUser = await app.prisma.user.upsert({
    where: { telegramId: "bot-system" },
    update: {},
    create: {
      telegramId: "bot-system",
      username: "bot_system",
      firstName: "Bot",
      lastName: "System",
      referralCode: "BOT-SYSTEM-" + randomUUID().slice(0, 8),
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

async function handleMatchCompletion(
  app: FastifyInstance,
  match: any,
  result: any,
  seed: string,
) {
  // 1. Update match record
  await app.prisma.match.update({
    where: { id: match.id },
    data: {
      status: "COMPLETED",
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      seed,
      homeCoins:
        result.winner === "home"
          ? MATCH.REWARDS.WIN_COINS
          : MATCH.REWARDS.LOSS_COINS,
      awayCoins:
        result.winner === "away"
          ? MATCH.REWARDS.WIN_COINS
          : MATCH.REWARDS.LOSS_COINS,
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
    const coins =
      result.winner === role
        ? MATCH.REWARDS.WIN_COINS
        : result.winner === "draw"
          ? MATCH.REWARDS.DRAW_COINS
          : MATCH.REWARDS.LOSS_COINS;

    const exp =
      result.winner === role ? 100 : result.winner === "draw" ? 40 : 20;

    const points =
      result.winner === role ? 25 : result.winner === "draw" ? 10 : -15;

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

  return {
    homeRewards: {
      coins:
        result.winner === "home"
          ? MATCH.REWARDS.WIN_COINS
          : MATCH.REWARDS.LOSS_COINS,
    },
  };
}

export async function acceptMatch(
  app: FastifyInstance,
  userId: string,
  matchId: string,
) {
  const match = await app.prisma.match.findUnique({
    where: { id: matchId },
  });

  if (!match) throw new Error("Match not found or expired");
  if (match.homeUserId === userId)
    throw new Error("You cannot challenge yourself");
  if (match.status !== "PENDING")
    throw new Error("This match has already started or been completed");

  // If match has a specific inviteee, verify it.
  if (match.awayUserId && match.awayUserId !== userId) {
    throw new Error("This invitation is intended for another player");
  }

  const myTeam = await app.prisma.team.findFirst({
    where: { userId, isEvent: false },
  });
  if (!myTeam) throw new Error("No team found. Complete the draft first.");

  // For open challenges, we update the match record with the actual joiner's team
  if (!match.awayUserId || match.awayTeamId !== myTeam.id) {
    await app.prisma.match.update({
      where: { id: matchId },
      data: {
        awayUserId: userId,
        awayTeamId: myTeam.id,
      },
    });
  }

  const seed = randomUUID();
  const homeTeamData = await getTeamForMatch(app, match.homeTeamId);
  const awayTeamData = await getTeamForMatch(app, myTeam.id);

  const result = simulateMatch(homeTeamData, awayTeamData, seed);

  await handleMatchCompletion(
    app,
    { ...match, awayUserId: userId, awayTeamId: myTeam.id },
    result,
    seed,
  );

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
      coins:
        result.winner === "away"
          ? MATCH.REWARDS.WIN_COINS
          : MATCH.REWARDS.LOSS_COINS,
      exp:
        result.winner === "away"
          ? MATCH.REWARDS.WIN_EXP
          : MATCH.REWARDS.LOSS_EXP,
    },
    isBot: false,
  };
}

export async function getMatchById(app: FastifyInstance, matchId: string) {
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

  if (!match) return null;

  // If match is completed, reconstruct the "result" object for simulation replay
  let result = null;
  if (match.status === "COMPLETED") {
    result = {
      homeScore: match.homeScore || 0,
      awayScore: match.awayScore || 0,
      winner:
        (match.homeScore || 0) > (match.awayScore || 0)
          ? "home"
          : (match.awayScore || 0) > (match.homeScore || 0)
            ? "away"
            : "draw",
      events: match.events.map((e) => ({
        minute: e.minute,
        type: e.type.toLowerCase(),
        team: e.team,
        playerId: e.playerId,
        playerName: e.playerName,
        description: e.description,
      })),
    };
  }

  return { match, result };
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
