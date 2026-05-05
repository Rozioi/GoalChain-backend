"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPlayerForRent = listPlayerForRent;
exports.getAvailableRentals = getAvailableRentals;
exports.rentPlayer = rentPlayer;
exports.checkExpiredRentals = checkExpiredRentals;
async function listPlayerForRent(app, userId, playerId, price, currency = "COIN") {
    const teamPlayer = await app.prisma.teamPlayer.findFirst({
        where: {
            playerId,
            team: { userId },
        },
    });
    if (!teamPlayer)
        throw new Error("Player not found in your team");
    const player = await app.prisma.player.findUnique({
        where: { id: playerId },
        include: { rent: true }
    });
    if (!player)
        throw new Error("Player not found");
    if (player.ownerId && player.ownerId !== userId) {
        throw new Error("Only the owner can list this player for rent");
    }
    return app.prisma.player.update({
        where: { id: playerId },
        data: {
            rent: {
                upsert: {
                    create: {
                        priceCoin: currency === "COIN" ? price : 0,
                        priceTon: currency === "TON" ? price : 0,
                        isRented: false,
                        durationOptions: [3600, 43200, 86400], // Default options
                        conditions: [],
                    },
                    update: {
                        priceCoin: currency === "COIN" ? price : 0,
                        priceTon: currency === "TON" ? price : 0,
                        isRented: false,
                    },
                },
            },
        },
        include: { rent: true },
    });
}
async function getAvailableRentals(app, userId) {
    return app.prisma.player.findMany({
        where: {
            rent: {
                isRented: false,
                OR: [
                    { priceCoin: { gt: 0 } },
                    { priceTon: { gt: 0 } }
                ]
            },
            NOT: { ownerId: userId },
        },
        include: { rent: true },
        orderBy: { overallRating: "desc" },
    });
}
async function rentPlayer(app, userId, playerId, days = 7) {
    const player = await app.prisma.player.findUnique({
        where: { id: playerId },
        include: { rent: true }
    });
    if (!player || !player.rent || (!player.rent.priceCoin && !player.rent.priceTon)) {
        throw new Error("Player not available for rent");
    }
    if (player.ownerId === userId) {
        throw new Error("You cannot rent your own player");
    }
    if (player.rent.isRented)
        throw new Error("Player already rented");
    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error("User not found");
    const rentPrice = player.rent.priceCoin || 0;
    const isCoin = (player.rent.priceCoin || 0) > 0;
    if (isCoin) {
        if (user.coins < rentPrice)
            throw new Error("Not enough coins");
    }
    else {
        // TON logic...
    }
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    const updatedPlayer = await app.prisma.player.update({
        where: { id: playerId },
        data: {
            rent: {
                update: {
                    isRented: true,
                    rentedById: userId,
                    startedAt: new Date(),
                    expiresAt: expiresAt,
                },
            },
        },
        include: { rent: true },
    });
    if (isCoin) {
        await app.prisma.user.update({
            where: { id: userId },
            data: { coins: { decrement: rentPrice } },
        });
        if (player.ownerId) {
            await app.prisma.user.update({
                where: { id: player.ownerId },
                data: { coins: { increment: rentPrice } },
            });
        }
    }
    // Add to team players list
    const renterTeam = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
    });
    if (renterTeam) {
        await app.prisma.teamPlayer.create({
            data: {
                teamId: renterTeam.id,
                playerId: player.id,
                isStarter: false,
            },
        });
    }
    return updatedPlayer;
}
async function checkExpiredRentals(app) {
    const expired = await app.prisma.playerRent.findMany({
        where: {
            isRented: true,
            expiresAt: { lte: new Date() },
        },
    });
    for (const rent of expired) {
        await app.prisma.$transaction([
            app.prisma.playerRent.update({
                where: { id: rent.id },
                data: {
                    isRented: false,
                    rentedById: null,
                    expiresAt: null,
                    startedAt: null,
                },
            }),
            app.prisma.teamPlayer.deleteMany({
                where: {
                    playerId: rent.playerId,
                    team: { userId: rent.rentedById },
                },
            }),
        ]);
    }
}
