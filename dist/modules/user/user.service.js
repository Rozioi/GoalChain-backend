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
exports.registerUser = registerUser;
exports.getUserProfile = getUserProfile;
exports.applyReferralCode = applyReferralCode;
exports.getUserReferrals = getUserReferrals;
exports.getInviterInfoByCode = getInviterInfoByCode;
exports.addExperience = addExperience;
exports.addPoints = addPoints;
const crypto_1 = require("crypto");
async function registerUser(app, telegramId, username, firstName, lastName, photoUrl) {
    const existing = await app.prisma.user.findUnique({
        where: { telegramId },
    });
    if (existing) {
        // Update photoUrl dynamically if they uploaded a new one on Telegram
        if (photoUrl && existing.photoUrl !== photoUrl) {
            await app.prisma.user.update({
                where: { id: existing.id },
                data: { photoUrl }
            });
            existing.photoUrl = photoUrl;
        }
        const token = app.jwt.sign({
            userId: existing.id,
            telegramId: existing.telegramId,
        });
        return { user: existing, token, isNew: false };
    }
    const referralCode = (0, crypto_1.randomBytes)(4).toString("hex").toUpperCase();
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
const rent_service_1 = require("../player/rent.service");
async function getUserProfile(app, userId) {
    // Background cleanup: sync rentals
    rent_service_1.rentService.syncExpiredRentals(app).catch(err => app.log.error(err, "Failed to sync rentals"));
    return app.prisma.user.findUnique({
        where: { id: userId },
        include: {
            teams: {
                where: { isEvent: false },
                include: {
                    players: {
                        include: { player: true },
                        orderBy: { isStarter: "desc" },
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
                    firstName: true,
                    lastName: true,
                    photoUrl: true,
                    createdAt: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
}
async function getInviterInfoByCode(app, code) {
    const inviter = await app.prisma.user.findUnique({
        where: { referralCode: code },
        select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
        }
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
