import { FastifyInstance } from "fastify";
import { randomBytes } from "crypto";

export async function registerUser(
  app: FastifyInstance,
  telegramId: string,
  username?: string,
  firstName?: string,
  lastName?: string,
  photoUrl?: string,
) {
  const existing = await app.prisma.user.findUnique({
    where: { telegramId },
  });

  if (existing) {
    if (photoUrl && existing.photoUrl !== photoUrl) {
      await app.prisma.user.update({
        where: { id: existing.id },
        data: { photoUrl },
      });
      existing.photoUrl = photoUrl;
    }

    const token = app.jwt.sign({
      userId: existing.id,
      telegramId: existing.telegramId,
    });
    return { user: existing, token, isNew: false };
  }

  const referralCode = randomBytes(4).toString("hex").toUpperCase();

  const user = await app.prisma.user.create({
    data: {
      telegramId,
      username,
      firstName,
      lastName,
      photoUrl,
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

  const activeContracts = await app.prisma.rentContract.findMany({
    where: { lessorId: userId, status: "ACTIVE" },
  });

  let rentIncomeCoins = 0;
  activeContracts.forEach((contract) => {
    const hours = Math.max(
      1,
      (contract.endDate.getTime() - contract.startDate.getTime()) /
        (1000 * 60 * 60),
    );
    rentIncomeCoins += Math.floor(contract.price / hours);
  });

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

  const mappedRentedOut = rentedOutPlayers.map((p) => {
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
          firstName: true,
          lastName: true,
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
      firstName: true,
      lastName: true,
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
