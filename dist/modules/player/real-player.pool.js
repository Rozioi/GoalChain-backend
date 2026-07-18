"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableRealPlayers = getAvailableRealPlayers;
exports.tryAcquireRealPlayerFromPool = tryAcquireRealPlayerFromPool;
const constants_1 = require("../../config/constants");
async function getAvailableRealPlayers(app, role) {
    return app.prisma.player.findMany({
        where: {
            isRealPlayer: true,
            ownerId: null,
            teamPlayers: { none: {} },
            ...(role ? { role } : {}),
        },
    });
}
async function tryAcquireRealPlayerFromPool(app, userId, role) {
    if (Math.random() > constants_1.REAL_PLAYER.DROP_CHANCE) {
        return null;
    }
    const available = await getAvailableRealPlayers(app, role);
    if (available.length === 0) {
        return null;
    }
    const picked = available[Math.floor(Math.random() * available.length)];
    return app.prisma.player.update({
        where: { id: picked.id },
        data: { ownerId: userId },
    });
}
