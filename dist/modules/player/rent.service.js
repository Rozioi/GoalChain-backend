"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rentService = void 0;
exports.rentService = {
    async listPlayerForRent(app, userId, playerId, price) {
        const player = await app.prisma.player.findUnique({
            where: { id: playerId },
            include: { teamPlayers: true },
        });
        if (!player)
            throw new Error("Player not found");
        if (player.ownerId !== userId)
            throw new Error("You do not own this player");
        return app.prisma.$transaction(async (tx) => {
            // 1. Remove from owner's active lineup (TeamPlayer)
            await tx.teamPlayer.deleteMany({
                where: { playerId, team: { userId } },
            });
            // 2. Set rent flags on Player
            return tx.player.update({
                where: { id: playerId },
                data: {
                    isOnRent: true,
                    rentPrice: price,
                },
            });
        });
    },
    async rentPlayer(app, renterId, playerId, durationDays) {
        const player = await app.prisma.player.findUnique({
            where: { id: playerId, isOnRent: true },
        });
        if (!player || !player.rentPrice)
            throw new Error("Player not available for rent");
        if (player.ownerId === renterId)
            throw new Error("You cannot rent your own player");
        const renter = await app.prisma.user.findUnique({ where: { id: renterId } });
        const owner = await app.prisma.user.findUnique({ where: { id: player.ownerId } });
        if (!renter)
            throw new Error("Renter not found");
        if (!owner)
            throw new Error("Owner not found");
        if (renter.coins < player.rentPrice)
            throw new Error("Insufficient funds");
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
        return app.prisma.$transaction(async (tx) => {
            // 1. Balances update
            await tx.user.update({
                where: { id: renterId },
                data: { coins: { decrement: player.rentPrice } },
            });
            await tx.user.update({
                where: { id: player.ownerId },
                data: { coins: { increment: player.rentPrice } },
            });
            // 2. Create RentContract
            const contract = await tx.rentContract.create({
                data: {
                    playerId,
                    lessorId: player.ownerId,
                    renterId,
                    price: player.rentPrice,
                    startDate,
                    endDate,
                    status: "ACTIVE",
                },
            });
            // 3. Move player to renter's team
            const renterTeam = await tx.team.findFirst({
                where: { userId: renterId, isEvent: false },
            });
            if (!renterTeam)
                throw new Error("Renter team not found");
            await tx.teamPlayer.create({
                data: {
                    teamId: renterTeam.id,
                    playerId,
                    isStarter: false,
                },
            });
            // 4. Update player rent status
            await tx.player.update({
                where: { id: playerId },
                data: { isOnRent: false }, // No longer on market, it's now rented
            });
            return contract;
        });
    },
    async returnPlayer(app, playerId) {
        const contract = await app.prisma.rentContract.findFirst({
            where: { playerId, status: "ACTIVE" },
        });
        if (!contract)
            throw new Error("No active rent contract found for this player");
        return app.prisma.$transaction(async (tx) => {
            // 1. Remove from renter's team
            await tx.teamPlayer.deleteMany({
                where: { playerId, team: { userId: contract.renterId } },
            });
            // 2. Add back to owner's team
            const ownerTeam = await tx.team.findFirst({
                where: { userId: contract.lessorId, isEvent: false },
            });
            if (ownerTeam) {
                await tx.teamPlayer.create({
                    data: {
                        teamId: ownerTeam.id,
                        playerId,
                        isStarter: false,
                    },
                });
            }
            // 3. Close contract
            await tx.rentContract.update({
                where: { id: contract.id },
                data: { status: "FINISHED" },
            });
            // 4. Reset player flags
            return tx.player.update({
                where: { id: playerId },
                data: { isOnRent: false, rentPrice: null },
            });
        });
    },
    async syncExpiredRentals(app) {
        const expiredContracts = await app.prisma.rentContract.findMany({
            where: {
                status: "ACTIVE",
                endDate: { lte: new Date() },
            },
        });
        for (const contract of expiredContracts) {
            try {
                await this.returnPlayer(app, contract.playerId);
                app.log.info(`Auto-returned player ${contract.playerId} from rental`);
            }
            catch (e) {
                app.log.error(`Failed to auto-return player ${contract.playerId}: ${e}`);
            }
        }
    },
};
