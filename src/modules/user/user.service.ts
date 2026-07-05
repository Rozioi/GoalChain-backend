import { FastifyInstance } from "fastify";
import { randomBytes, createHmac } from "crypto";
import { AppError } from "../../utils/app-error";
import { calculatePublicRating } from "../player/synergy.engine";

interface TelegramUserData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export interface ClubInfo {
  clubName: string;
  clubIcon: string;
}

export function calculateTeamPublicOvr(players: any[]): number {
  const formattedPlayers = players.map((tp: any) => ({
    position: tp.player.position,
    role: tp.player.role,
    style: tp.player.style,
    overallRating: tp.player.overallRating,
  }));

  return calculatePublicRating(formattedPlayers);
}

export function verifyTelegramInitData(
  initData: string,
  botToken: string,
): boolean {
  if (
    process.env.NODE_ENV !== "production" &&
    (!initData || initData === "mock")
  ) {
    return true;
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return false;

    params.delete("hash");

    const keys = Array.from(params.keys()).sort();
    const dataCheckString = keys
      .map((key) => `${key}=${params.get(key)}`)
      .join("\n");

    const secretKey = createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    const calculatedHash = createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    return calculatedHash === hash;
  } catch (e) {
    return false;
  }
}

export function parseTelegramInitData(
  initData: string,
): TelegramUserData | null {
  if (
    process.env.NODE_ENV !== "production" &&
    (!initData || initData === "mock")
  ) {
    return {
      id: 12345678,
      username: "test_user",
      first_name: "Test",
      last_name: "User",
    };
  }

  try {
    const params = new URLSearchParams(initData);
    const userString = params.get("user");
    if (!userString) return null;
    return JSON.parse(userString) as TelegramUserData;
  } catch (e) {
    return null;
  }
}

export async function loginUser(app: FastifyInstance, initData: string) {
  const botToken = process.env.BOT_TOKEN || "";
  const isValid = verifyTelegramInitData(initData, botToken);
  if (!isValid) {
    throw new AppError("Invalid Telegram signature", 401);
  }

  const tgUser = parseTelegramInitData(initData);
  if (!tgUser) {
    throw new AppError("Could not parse Telegram user data", 400);
  }

  const telegramId = String(tgUser.id);
  const existing = await app.prisma.user.findUnique({
    where: { telegramId },
  });

  if (!existing) {
    return { isRegistered: false };
  }

  const updates: Record<string, string | undefined> = {};
  if (tgUser.username && existing.username !== tgUser.username) {
    updates.username = tgUser.username;
  }
  if (tgUser.first_name && existing.firstName !== tgUser.first_name) {
    updates.firstName = tgUser.first_name;
  }
  if (tgUser.last_name && existing.lastName !== tgUser.last_name) {
    updates.lastName = tgUser.last_name;
  }
  if (tgUser.photo_url && existing.photoUrl !== tgUser.photo_url) {
    updates.photoUrl = tgUser.photo_url;
  }

  if (Object.keys(updates).length > 0) {
    await app.prisma.user.update({
      where: { id: existing.id },
      data: updates,
    });
    Object.assign(existing, updates);
  }

  const token = app.jwt.sign({
    userId: existing.id,
    telegramId: existing.telegramId,
  });

  return { user: existing, token, isRegistered: true };
}

export async function registerUser(
  app: FastifyInstance,
  initData: string,
  clubInfo: ClubInfo,
) {
  const botToken = process.env.BOT_TOKEN || "";
  const isValid = verifyTelegramInitData(initData, botToken);
  if (!isValid) {
    throw new AppError("Invalid Telegram signature", 401);
  }

  const tgUser = parseTelegramInitData(initData);
  if (!tgUser) {
    throw new AppError("Could not parse Telegram user data", 400);
  }

  const telegramId = String(tgUser.id);
  const existing = await app.prisma.user.findUnique({
    where: { telegramId },
  });

  if (existing) {
    const updates: Record<string, string | undefined> = {};
    if (tgUser.username && existing.username !== tgUser.username) {
      updates.username = tgUser.username;
    }
    if (tgUser.first_name && existing.firstName !== tgUser.first_name) {
      updates.firstName = tgUser.first_name;
    }
    if (tgUser.last_name && existing.lastName !== tgUser.last_name) {
      updates.lastName = tgUser.last_name;
    }
    if (tgUser.photo_url && existing.photoUrl !== tgUser.photo_url) {
      updates.photoUrl = tgUser.photo_url;
    }

    if (Object.keys(updates).length > 0) {
      await app.prisma.user.update({
        where: { id: existing.id },
        data: updates,
      });
      Object.assign(existing, updates);
    }

    const token = app.jwt.sign({
      userId: existing.id,
      telegramId: existing.telegramId,
    });
    return { user: existing, token, isNew: false };
  }

  const referralCode = randomBytes(4).toString("hex").toUpperCase();
  console.log(clubInfo);
  const user = await app.prisma.user.create({
    data: {
      telegramId,
      username: tgUser.username,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name,
      clubName: clubInfo.clubName.trim(),
      clubIcon: clubInfo.clubIcon || "default",
      photoUrl: tgUser.photo_url,
      referralCode,
    },
  });

  const token = app.jwt.sign({
    userId: user.id,
    telegramId: user.telegramId,
  });

  return { user, token, isNew: true };
}

import { rentService } from "../player/rent.service";
import { syncUserEnergy } from "./energy.service";

export async function syncTelegramProfile(
  app: FastifyInstance,
  userId: string,
  initData: string,
) {
  const botToken = process.env.BOT_TOKEN || "";
  const isValid = verifyTelegramInitData(initData, botToken);
  if (!isValid) {
    throw new AppError("Invalid Telegram signature", 401);
  }

  const tgUser = parseTelegramInitData(initData);
  if (!tgUser) {
    throw new AppError("Could not parse Telegram user data", 400);
  }

  const user = await app.prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const updates: Record<string, string | undefined> = {};

  if (tgUser.username && user.username !== tgUser.username) {
    updates.username = tgUser.username;
  }
  if (tgUser.first_name && user.firstName !== tgUser.first_name) {
    updates.firstName = tgUser.first_name;
  }
  if (tgUser.last_name && user.lastName !== tgUser.last_name) {
    updates.lastName = tgUser.last_name;
  }
  if (tgUser.photo_url && user.photoUrl !== tgUser.photo_url) {
    updates.photoUrl = tgUser.photo_url;
  }

  if (Object.keys(updates).length > 0) {
    await app.prisma.user.update({
      where: { id: userId },
      data: updates,
    });
  }

  return getUserProfile(app, userId);
}

export async function getUserProfile(app: FastifyInstance, userId: string) {
  rentService
    .syncExpiredRentals(app)
    .catch((err) => app.log.error(err, "Failed to sync rentals"));

  const user = await app.prisma.user.findUnique({
    where: { id: userId },
    include: {
      teams: {
        where: { isEvent: false },
        include: {
          players: {
            include: { player: true },
            orderBy: [{ isStarter: "desc" }, { positionInFormation: "asc" }],
          },
        },
      },
      _count: {
        select: {
          referralsMade: true,
        },
      },
    },
  });

  if (!user) return null;

  const energyState = await syncUserEnergy(app, userId);

  const activeContracts = await app.prisma.rentContract.findMany({
    where: { lessorId: userId, status: "ACTIVE" },
  });

  let rentIncomeCoins = 0;
  activeContracts.forEach((contract: any) => {
    const hours = Math.max(
      1,
      (contract.endDate.getTime() - contract.startDate.getTime()) /
        (1000 * 60 * 60),
    );
    rentIncomeCoins += Math.floor(contract.price / hours);
  });
  const publicOvr = calculateTeamPublicOvr(user.teams[0].players);
  const rentedOutPlayers = await app.prisma.player.findMany({
    where: {
      ownerId: userId,
      rentContracts: { some: { status: "ACTIVE" } },
    },
    include: {
      rentContracts: {
        where: { status: "ACTIVE" },
        orderBy: { startDate: "desc" },
        take: 1,
      },
    },
  });

  const mappedRentedOut = rentedOutPlayers.map((p: any) => {
    const contract = p.rentContracts[0];
    let hourlyIncome = 0;
    if (contract) {
      const hours = Math.max(
        1,
        (contract.endDate.getTime() - contract.startDate.getTime()) /
          (1000 * 60 * 60),
      );
      hourlyIncome = Math.floor(contract.price / hours);
    }
    return {
      ...p,
      activeContract: contract,
      hourlyIncome,
    };
  });

  return {
    ...user,
    energy: energyState.energy,
    publicOvr: publicOvr,
    maxEnergy: energyState.maxEnergy,
    energyUpdatedAt: energyState.energyUpdatedAt.toISOString(),
    nextRegenAt: energyState.nextRegenAt,
    rentIncomeCoins,
    rentIncomeGems: 0,
    rentedOutPlayers: mappedRentedOut,
  };
}

export async function applyReferralCode(
  app: FastifyInstance,
  userId: string,
  code: string,
) {
  const inviter = await app.prisma.user.findUnique({
    where: { referralCode: code },
  });

  if (!inviter) {
    throw new Error("Invalid referral code");
  }

  if (inviter.id === userId) {
    throw new Error("Cannot use your own referral code");
  }

  const user = await app.prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.referredById) throw new Error("Already used a referral code");

  const { REFERRAL } = await import("../../config/constants");
  const { updateTaskProgress } = await import("../task/task.service");

  await app.prisma.$transaction([
    app.prisma.user.update({
      where: { id: userId },
      data: {
        referredById: inviter.id,
        coins: { increment: REFERRAL.INVITEE_REWARD },
      },
    }),
    app.prisma.user.update({
      where: { id: inviter.id },
      data: {
        coins: { increment: REFERRAL.INVITER_REWARD },
      },
    }),
    app.prisma.referral.create({
      data: {
        inviterId: inviter.id,
        inviteeId: userId,
        reward: REFERRAL.INVITER_REWARD,
      },
    }),
  ]);

  await updateTaskProgress(app, inviter.id, "REFERRALS", 1);

  return { success: true, bonus: REFERRAL.INVITEE_REWARD };
}

export async function getUserReferrals(app: FastifyInstance, userId: string) {
  return app.prisma.referral.findMany({
    where: { inviterId: userId },
    include: {
      invitee: {
        select: {
          id: true,
          telegramId: true,
          username: true,
          clubName: true,
          clubIcon: true,
          photoUrl: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInviterInfoByCode(app: FastifyInstance, code: string) {
  const inviter = await app.prisma.user.findUnique({
    where: { referralCode: code },
    select: {
      id: true,
      username: true,
      clubName: true,
      clubIcon: true,
      photoUrl: true,
    },
  });
  if (!inviter) {
    throw new Error("Inviter not found");
  }
  return inviter;
}

export async function addExperience(
  app: FastifyInstance,
  userId: string,
  amount: number,
) {
  const user = await app.prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  let newExp = user.experience + amount;
  let newLevel = user.level;

  while (newExp >= newLevel * 500) {
    newExp -= newLevel * 500;
    newLevel += 1;
  }

  return app.prisma.user.update({
    where: { id: userId },
    data: {
      experience: newExp,
      level: newLevel,
    },
  });
}

export async function addPoints(
  app: FastifyInstance,
  userId: string,
  amount: number,
) {
  const user = await app.prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  let newPoints = Math.max(0, user.points + amount);

  return app.prisma.user.update({
    where: { id: userId },
    data: { points: newPoints },
  });
}

export async function getUserGlobalRank(app: FastifyInstance, userId: string) {
  const user = await app.prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const globalRank = await app.prisma.user.count({
    where: { points: { gte: user.points } },
  });

  return globalRank;
}

export async function getLeaderboard(app: FastifyInstance, limit: number) {
  const leaderboard = await app.prisma.user.findMany({
    orderBy: { points: "desc" },
    take: limit,
    select: {
      id: true,
      username: true,
      photoUrl: true,
      points: true,
    },
  });

  return leaderboard;
}
