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
exports.calculateTeamPublicOvr = calculateTeamPublicOvr;
exports.verifyTelegramInitData = verifyTelegramInitData;
exports.parseTelegramInitData = parseTelegramInitData;
exports.loginUser = loginUser;
exports.registerUser = registerUser;
exports.syncTelegramProfile = syncTelegramProfile;
exports.getUserProfile = getUserProfile;
exports.applyReferralCode = applyReferralCode;
exports.getUserReferrals = getUserReferrals;
exports.getInviterInfoByCode = getInviterInfoByCode;
exports.addExperience = addExperience;
exports.addPoints = addPoints;
exports.getUserGlobalRank = getUserGlobalRank;
exports.getLeaderboard = getLeaderboard;
const crypto_1 = require("crypto");
const app_error_1 = require("../../utils/app-error");
const synergy_engine_1 = require("../player/synergy.engine");
function calculateTeamPublicOvr(players) {
    const formattedPlayers = players.map((tp) => ({
        position: tp.player.position,
        role: tp.player.role,
        style: tp.player.style,
        overallRating: tp.player.overallRating,
    }));
    return (0, synergy_engine_1.calculatePublicRating)(formattedPlayers);
}
function verifyTelegramInitData(initData, botToken) {
    if (process.env.NODE_ENV !== "production" &&
        (!initData || initData === "mock")) {
        return true;
    }
    try {
        const params = new URLSearchParams(initData);
        const hash = params.get("hash");
        if (!hash)
            return false;
        params.delete("hash");
        const keys = Array.from(params.keys()).sort();
        const dataCheckString = keys
            .map((key) => `${key}=${params.get(key)}`)
            .join("\n");
        const secretKey = (0, crypto_1.createHmac)("sha256", "WebAppData")
            .update(botToken)
            .digest();
        const calculatedHash = (0, crypto_1.createHmac)("sha256", secretKey)
            .update(dataCheckString)
            .digest("hex");
        return calculatedHash === hash;
    }
    catch (e) {
        return false;
    }
}
function parseTelegramInitData(initData) {
    if (process.env.NODE_ENV !== "production" &&
        (!initData || initData === "mock")) {
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
        if (!userString)
            return null;
        return JSON.parse(userString);
    }
    catch (e) {
        return null;
    }
}
async function loginUser(app, initData) {
    const botToken = process.env.BOT_TOKEN || "";
    const isValid = verifyTelegramInitData(initData, botToken);
    if (!isValid) {
        throw new app_error_1.AppError("Invalid Telegram signature", 401);
    }
    const tgUser = parseTelegramInitData(initData);
    if (!tgUser) {
        throw new app_error_1.AppError("Could not parse Telegram user data", 400);
    }
    const telegramId = String(tgUser.id);
    const existing = await app.prisma.user.findUnique({
        where: { telegramId },
    });
    if (!existing) {
        return { isRegistered: false };
    }
    const updates = {};
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
async function registerUser(app, initData, clubInfo) {
    const botToken = process.env.BOT_TOKEN || "";
    const isValid = verifyTelegramInitData(initData, botToken);
    if (!isValid) {
        throw new app_error_1.AppError("Invalid Telegram signature", 401);
    }
    const tgUser = parseTelegramInitData(initData);
    if (!tgUser) {
        throw new app_error_1.AppError("Could not parse Telegram user data", 400);
    }
    const telegramId = String(tgUser.id);
    const existing = await app.prisma.user.findUnique({
        where: { telegramId },
    });
    if (existing) {
        const updates = {};
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
    const referralCode = (0, crypto_1.randomBytes)(4).toString("hex").toUpperCase();
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
const rent_service_1 = require("../player/rent.service");
const energy_service_1 = require("./energy.service");
async function syncTelegramProfile(app, userId, initData) {
    const botToken = process.env.BOT_TOKEN || "";
    const isValid = verifyTelegramInitData(initData, botToken);
    if (!isValid) {
        throw new app_error_1.AppError("Invalid Telegram signature", 401);
    }
    const tgUser = parseTelegramInitData(initData);
    if (!tgUser) {
        throw new app_error_1.AppError("Could not parse Telegram user data", 400);
    }
    const user = await app.prisma.user.findUnique({
        where: { id: userId },
    });
    if (!user) {
        throw new app_error_1.AppError("User not found", 404);
    }
    const updates = {};
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
async function getUserProfile(app, userId) {
    rent_service_1.rentService
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
    if (!user)
        return null;
    const energyState = await (0, energy_service_1.syncUserEnergy)(app, userId);
    const activeContracts = await app.prisma.rentContract.findMany({
        where: { lessorId: userId, status: "ACTIVE" },
    });
    let rentIncomeCoins = 0;
    activeContracts.forEach((contract) => {
        const hours = Math.max(1, (contract.endDate.getTime() - contract.startDate.getTime()) /
            (1000 * 60 * 60));
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
    const mappedRentedOut = rentedOutPlayers.map((p) => {
        const contract = p.rentContracts[0];
        let hourlyIncome = 0;
        if (contract) {
            const hours = Math.max(1, (contract.endDate.getTime() - contract.startDate.getTime()) /
                (1000 * 60 * 60));
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
async function applyReferralCode(app, userId, code) {
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
    if (!user)
        throw new Error("User not found");
    if (user.referredById)
        throw new Error("Already used a referral code");
    const { REFERRAL } = await Promise.resolve().then(() => __importStar(require("../../config/constants")));
    const { updateTaskProgress } = await Promise.resolve().then(() => __importStar(require("../task/task.service")));
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
async function getUserReferrals(app, userId) {
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
async function getInviterInfoByCode(app, code) {
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
async function addExperience(app, userId, amount) {
    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        return;
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
async function addPoints(app, userId, amount) {
    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        return;
    let newPoints = Math.max(0, user.points + amount);
    return app.prisma.user.update({
        where: { id: userId },
        data: { points: newPoints },
    });
}
async function getUserGlobalRank(app, userId) {
    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        return null;
    const globalRank = await app.prisma.user.count({
        where: { points: { gte: user.points } },
    });
    return globalRank;
}
async function getLeaderboard(app, limit) {
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
