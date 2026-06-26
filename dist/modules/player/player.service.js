"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlayerImage = getPlayerImage;
exports.getPlayerById = getPlayerById;
async function getPlayerImage(app, playerId) {
    const player = await app.prisma.player.findUnique({
        where: { id: playerId },
    });
    if (!player)
        throw new Error("Player not found");
    return player.imageUrl;
}
async function getPlayerById(app, playerId) {
    const player = await app.prisma.player.findUnique({
        where: { id: playerId },
    });
    if (!player)
        throw new Error("Player not found");
    return player;
}
