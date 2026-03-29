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
const crypto_1 = require("crypto");
async function registerUser(app, telegramId, username, firstName, lastName) {
    const existing = await app.prisma.user.findUnique({
        where: { telegramId },
    });
    if (existing) {
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
            referralCode,
        },
    });
    const token = app.jwt.sign({
        userId: user.id,
        telegramId: user.telegramId,
    });
    return { user, token, isNew: true };
}
async function getUserProfile(app, userId) {
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
                    createdAt: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
}
