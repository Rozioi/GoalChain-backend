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
exports.inviteFriend = inviteFriend;
exports.createOpenChallenge = createOpenChallenge;
exports.acceptInvite = acceptInvite;
exports.declineInvite = declineInvite;
exports.cancelInvite = cancelInvite;
exports.getPendingInvites = getPendingInvites;
exports.expireStaleInvites = expireStaleInvites;
exports.acceptMatchLegacy = acceptMatchLegacy;
const constants_1 = require("../../config/constants");
const socket_emitter_1 = require("../../ws/socket.emitter");
const types_1 = require("../../ws/types");
const socket_connection_handler_1 = require("../../ws/socket.connection.handler");
const match_live_service_1 = require("./match-live.service");
function buildInviteLink(inviteId) {
    const botName = process.env.TELEGRAM_BOT_USERNAME || "goalchaintest_bot";
    return `https://t.me/${botName}/startapp?startapp=match_${inviteId}`;
}
async function assertNoDuplicateInvite(app, senderId, recipientId) {
    const existing = await app.prisma.matchInvite.findFirst({
        where: {
            senderId,
            recipientId,
            status: "PENDING",
            expiresAt: { gt: new Date() },
        },
    });
    if (existing) {
        throw new Error("Active invite already exists for this player");
    }
}
async function getUserTeam(app, userId) {
    const team = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
    });
    if (!team)
        throw new Error("No team found. Complete the draft first.");
    return team;
}
async function inviteFriend(app, senderId, friendId) {
    if (senderId === friendId)
        throw new Error("You cannot invite yourself");
    const friend = await app.prisma.user.findUnique({ where: { id: friendId } });
    if (!friend)
        throw new Error("Friend not found");
    await getUserTeam(app, friendId);
    const myTeam = await getUserTeam(app, senderId);
    await assertNoDuplicateInvite(app, senderId, friendId);
    const expiresAt = new Date(Date.now() + constants_1.INVITE.FRIEND_TTL_MS);
    const invite = await app.prisma.matchInvite.create({
        data: {
            type: "FRIEND",
            status: "PENDING",
            senderId,
            recipientId: friendId,
            senderTeamId: myTeam.id,
            expiresAt,
        },
    });
    const sender = await app.prisma.user.findUnique({
        where: { id: senderId },
        select: { id: true, clubName: true, points: true },
    });
    const inviteLink = buildInviteLink(invite.id);
    const payload = {
        inviteId: invite.id,
        type: "FRIEND",
        sender,
        expiresAt: expiresAt.toISOString(),
        inviteLink,
    };
    const friendOnline = (0, socket_connection_handler_1.isUserOnline)(friendId);
    if (friendOnline) {
        (0, socket_emitter_1.emitToUser)(friendId, types_1.ServerEvent.INVITE_RECEIVED, payload);
    }
    else {
        const { bot } = await Promise.resolve().then(() => __importStar(require("../../bot/bot")));
        if (bot && friend.telegramId) {
            const text = `⚽️ *${sender?.clubName || "Твой друг"}* бросил тебе вызов в Football Manager!\n\nНажми кнопку ниже, чтобы принять вызов.`;
            await bot.api
                .sendMessage(friend.telegramId, text, {
                parse_mode: "Markdown",
                reply_markup: {
                    inline_keyboard: [[{ text: "Принять вызов ⚔️", url: inviteLink }]],
                },
            })
                .catch((err) => app.log.warn({ err }, "Failed to send bot notification"));
        }
    }
    (0, socket_emitter_1.emitToUser)(senderId, types_1.ServerEvent.INVITE_SENT, {
        inviteId: invite.id,
        inviteLink,
        expiresAt: expiresAt.toISOString(),
        delivery: friendOnline ? "websocket" : "telegram",
    });
    return { inviteId: invite.id, inviteLink, expiresAt, delivery: friendOnline ? "websocket" : "telegram" };
}
async function createOpenChallenge(app, senderId) {
    const myTeam = await getUserTeam(app, senderId);
    const activeOpen = await app.prisma.matchInvite.findFirst({
        where: {
            senderId,
            type: "OPEN",
            status: "PENDING",
            expiresAt: { gt: new Date() },
        },
    });
    if (activeOpen) {
        return {
            inviteId: activeOpen.id,
            inviteLink: buildInviteLink(activeOpen.id),
            expiresAt: activeOpen.expiresAt,
        };
    }
    const expiresAt = new Date(Date.now() + constants_1.INVITE.OPEN_TTL_MS);
    const invite = await app.prisma.matchInvite.create({
        data: {
            type: "OPEN",
            status: "PENDING",
            senderId,
            recipientId: null,
            senderTeamId: myTeam.id,
            expiresAt,
        },
    });
    return {
        inviteId: invite.id,
        inviteLink: buildInviteLink(invite.id),
        expiresAt,
    };
}
async function acceptInvite(app, userId, inviteId) {
    const invite = await app.prisma.matchInvite.findUnique({
        where: { id: inviteId },
    });
    if (!invite)
        throw new Error("Invite not found");
    if (invite.status !== "PENDING")
        throw new Error("Invite is no longer active");
    if (invite.expiresAt <= new Date()) {
        await app.prisma.matchInvite.update({
            where: { id: inviteId },
            data: { status: "EXPIRED" },
        });
        throw new Error("Invite has expired");
    }
    if (invite.type === "FRIEND") {
        if (invite.recipientId !== userId) {
            throw new Error("This invitation is intended for another player");
        }
    }
    else if (invite.senderId === userId) {
        throw new Error("You cannot accept your own challenge");
    }
    const myTeam = await getUserTeam(app, userId);
    const updated = await app.prisma.matchInvite.updateMany({
        where: { id: inviteId, status: "PENDING" },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
    if (updated.count === 0)
        throw new Error("Invite already processed");
    const match = await (0, match_live_service_1.createMatchFromInvite)(app, {
        inviteId,
        homeUserId: invite.senderId,
        awayUserId: userId,
        homeTeamId: invite.senderTeamId,
        awayTeamId: myTeam.id,
        type: "CHALLENGE",
    });
    (0, socket_emitter_1.emitToUser)(invite.senderId, types_1.ServerEvent.INVITE_ACCEPTED, {
        inviteId,
        matchId: match.id,
        acceptedBy: userId,
    });
    if (app.io) {
        app.io.in((0, socket_emitter_1.userRoom)(invite.senderId)).socketsJoin((0, socket_emitter_1.matchRoom)(match.id));
        app.io.in((0, socket_emitter_1.userRoom)(userId)).socketsJoin((0, socket_emitter_1.matchRoom)(match.id));
    }
    return { inviteId, matchId: match.id, match };
}
async function declineInvite(app, userId, inviteId) {
    const invite = await app.prisma.matchInvite.findUnique({
        where: { id: inviteId },
    });
    if (!invite)
        throw new Error("Invite not found");
    if (invite.recipientId !== userId)
        throw new Error("Not your invite");
    if (invite.status !== "PENDING")
        throw new Error("Invite is no longer active");
    await app.prisma.matchInvite.update({
        where: { id: inviteId },
        data: { status: "DECLINED", declinedAt: new Date() },
    });
    (0, socket_emitter_1.emitToUser)(invite.senderId, types_1.ServerEvent.INVITE_DECLINED, { inviteId, declinedBy: userId });
    return { success: true };
}
async function cancelInvite(app, userId, inviteId) {
    const invite = await app.prisma.matchInvite.findUnique({
        where: { id: inviteId },
    });
    if (!invite)
        throw new Error("Invite not found");
    if (invite.senderId !== userId)
        throw new Error("Not your invite");
    if (invite.status !== "PENDING")
        throw new Error("Invite is no longer active");
    await app.prisma.matchInvite.update({
        where: { id: inviteId },
        data: { status: "CANCELLED" },
    });
    const recipients = [invite.senderId];
    if (invite.recipientId)
        recipients.push(invite.recipientId);
    (0, socket_emitter_1.emitToUsers)(recipients, types_1.ServerEvent.INVITE_CANCELLED, { inviteId });
    return { success: true };
}
async function getPendingInvites(app, userId) {
    return app.prisma.matchInvite.findMany({
        where: {
            OR: [{ recipientId: userId }, { senderId: userId }],
            status: "PENDING",
            expiresAt: { gt: new Date() },
        },
        include: {
            sender: { select: { id: true, clubName: true, points: true } },
            recipient: { select: { id: true, clubName: true, points: true } },
        },
        orderBy: { createdAt: "desc" },
    });
}
async function expireStaleInvites(app) {
    const expired = await app.prisma.matchInvite.findMany({
        where: { status: "PENDING", expiresAt: { lte: new Date() } },
    });
    if (expired.length === 0)
        return 0;
    await app.prisma.matchInvite.updateMany({
        where: { id: { in: expired.map((i) => i.id) } },
        data: { status: "EXPIRED" },
    });
    for (const invite of expired) {
        const userIds = [invite.senderId];
        if (invite.recipientId)
            userIds.push(invite.recipientId);
        (0, socket_emitter_1.emitToUsers)(userIds, types_1.ServerEvent.INVITE_EXPIRED, { inviteId: invite.id });
    }
    return expired.length;
}
async function acceptMatchLegacy(app, userId, matchOrInviteId) {
    const invite = await app.prisma.matchInvite.findUnique({
        where: { id: matchOrInviteId },
    });
    if (invite)
        return acceptInvite(app, userId, matchOrInviteId);
    const legacyMatch = await app.prisma.match.findUnique({
        where: { id: matchOrInviteId },
    });
    if (legacyMatch?.status === "READY" || legacyMatch?.status === "IN_PROGRESS") {
        return { matchId: legacyMatch.id, match: legacyMatch };
    }
    throw new Error("Invite not found or expired");
}
