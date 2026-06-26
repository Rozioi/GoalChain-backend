"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerConnectionHandlers = registerConnectionHandlers;
exports.isUserOnline = isUserOnline;
const socket_emitter_1 = require("./socket.emitter");
const types_1 = require("./types");
const match_live_service_1 = require("../modules/match/match-live.service");
const connectedUsers = new Map(); // userId → socketIds
function registerConnectionHandlers(app, io) {
    io.on("connection", (rawSocket) => {
        const socket = rawSocket;
        const { userId } = socket.data.user;
        if (!connectedUsers.has(userId)) {
            connectedUsers.set(userId, new Set());
        }
        connectedUsers.get(userId).add(socket.id);
        socket.join((0, socket_emitter_1.userRoom)(userId));
        socket.emit(types_1.ServerEvent.CONNECTED, { userId });
        restoreUserRooms(app, socket, userId).catch((err) => {
            app.log.error({ err, userId }, "Failed to restore user rooms");
        });
        socket.on(types_1.ClientEvent.PING, () => {
            socket.emit(types_1.ServerEvent.PONG, { ts: Date.now() });
        });
        socket.on(types_1.ClientEvent.MATCH_READY, async (payload) => {
            try {
                await (0, match_live_service_1.markPlayerReady)(app, userId, payload.matchId);
            }
            catch (err) {
                socket.emit(types_1.ServerEvent.ERROR, { message: err.message });
            }
        });
        socket.on(types_1.ClientEvent.TACTICS_UPDATE, async (payload) => {
            try {
                await (0, match_live_service_1.updateLiveTactics)(app, payload.matchId, userId, {
                    pressingType: payload.pressingType,
                    substitutions: payload.substitutions,
                });
            }
            catch (err) {
                socket.emit(types_1.ServerEvent.ERROR, { message: err.message });
            }
        });
        socket.on("disconnect", async () => {
            const sockets = connectedUsers.get(userId);
            if (sockets) {
                sockets.delete(socket.id);
                if (sockets.size === 0) {
                    connectedUsers.delete(userId);
                    await handleUserDisconnect(app, userId);
                }
            }
        });
    });
}
async function restoreUserRooms(app, socket, userId) {
    const activeMatch = await app.prisma.match.findFirst({
        where: {
            OR: [{ homeUserId: userId }, { awayUserId: userId }],
            status: { in: ["READY", "IN_PROGRESS"] },
        },
        orderBy: { updatedAt: "desc" },
    });
    if (activeMatch) {
        socket.join((0, socket_emitter_1.matchRoom)(activeMatch.id));
        socket.emit(types_1.ServerEvent.PLAYER_RECONNECTED, { matchId: activeMatch.id });
        const opponentId = activeMatch.homeUserId === userId
            ? activeMatch.awayUserId
            : activeMatch.homeUserId;
        if (opponentId) {
            (0, socket_emitter_1.emitToMatch)(activeMatch.id, types_1.ServerEvent.PLAYER_RECONNECTED, {
                matchId: activeMatch.id,
                userId,
            });
        }
    }
    const pendingInvites = await app.prisma.matchInvite.findMany({
        where: {
            OR: [{ recipientId: userId }, { senderId: userId }],
            status: "PENDING",
            expiresAt: { gt: new Date() },
        },
    });
    for (const invite of pendingInvites) {
        const inviteLink = `https://t.me/${process.env.TELEGRAM_BOT_USERNAME || "goalchaintest_bot"}/startapp?startapp=invite_${invite.id}`;
        if (invite.recipientId === userId) {
            const sender = await app.prisma.user.findUnique({
                where: { id: invite.senderId },
                select: { id: true, clubName: true, points: true },
            });
            socket.emit(types_1.ServerEvent.INVITE_RECEIVED, {
                inviteId: invite.id,
                type: invite.type,
                sender,
                expiresAt: invite.expiresAt.toISOString(),
                inviteLink,
            });
        }
        if (invite.senderId === userId && invite.type === "FRIEND") {
            socket.emit(types_1.ServerEvent.INVITE_SENT, {
                inviteId: invite.id,
                inviteLink,
                expiresAt: invite.expiresAt.toISOString(),
                delivery: "restored",
            });
        }
    }
}
async function handleUserDisconnect(app, userId) {
    const activeMatch = await app.prisma.match.findFirst({
        where: {
            OR: [{ homeUserId: userId }, { awayUserId: userId }],
            status: "IN_PROGRESS",
        },
    });
    if (activeMatch) {
        (0, socket_emitter_1.emitToMatch)(activeMatch.id, types_1.ServerEvent.PLAYER_DISCONNECTED, {
            matchId: activeMatch.id,
            userId,
        });
    }
}
function isUserOnline(userId) {
    return connectedUsers.has(userId) && connectedUsers.get(userId).size > 0;
}
