import { FastifyInstance } from "fastify";
import { RentStatus } from "@prisma/client";
import { RENT } from "../../config/constants";

export const rentService = {
  async listPlayerForRent(
    app: FastifyInstance,
    userId: string,
    playerId: string,
    price: number,
  ) {
    const player = await app.prisma.player.findUnique({
      where: { id: playerId },
      include: { teamPlayers: true },
    });

    if (!player) throw new Error("Player not found");
    if (player.ownerId !== userId)
      throw new Error("You do not own this player");

    return app.prisma.$transaction(async (tx) => {
      await tx.teamPlayer.deleteMany({
        where: { playerId, team: { userId } },
      });

      return tx.player.update({
        where: { id: playerId },
        data: {
          isOnRent: true,
          rentPrice: price,
        },
      });
    });
  },

  async rentPlayer(
    app: FastifyInstance,
    renterId: string,
    playerId: string,
    durationDays: number,
  ) {
    const player = await app.prisma.player.findUnique({
      where: { id: playerId, isOnRent: true },
    });

    if (!player || !player.rentPrice)
      throw new Error("Player not available for rent");
    if (player.ownerId === renterId)
      throw new Error("You cannot rent your own player");

    const renter = await app.prisma.user.findUnique({
      where: { id: renterId },
    });
    const owner = await app.prisma.user.findUnique({
      where: { id: player.ownerId! },
    });

    if (!renter) throw new Error("Renter not found");
    if (!owner) throw new Error("Owner not found");
    if (renter.coins < player.rentPrice) throw new Error("Insufficient funds");

    const commission = Math.floor(player.rentPrice * RENT.COMMISSION_RATE);
    const ownerGain = player.rentPrice - commission;

    const startDate = new Date();
    const endDate = new Date(
      startDate.getTime() + durationDays * 24 * 60 * 60 * 1000,
    );

    return app.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: renterId },
        data: { coins: { decrement: player.rentPrice! } },
      });

      await tx.economyLog.create({
        data: {
          userId: renterId,
          amount: -player.rentPrice!,
          source: "RENTAL_FEE",
          details: { playerId, role: "renter" },
        },
      });

      await tx.user.update({
        where: { id: player.ownerId! },
        data: { coins: { increment: ownerGain } },
      });

      await tx.economyLog.create({
        data: {
          userId: player.ownerId!,
          amount: ownerGain,
          source: "RENTAL_FEE",
          details: { playerId, role: "owner", commission },
        },
      });

      const contract = await tx.rentContract.create({
        data: {
          playerId,
          lessorId: player.ownerId!,
          renterId,
          price: player.rentPrice!,
          startDate,
          endDate,
          status: "ACTIVE",
        },
      });

      const renterTeam = await tx.team.findFirst({
        where: { userId: renterId, isEvent: false },
      });

      if (!renterTeam) throw new Error("Renter team not found");

      await tx.teamPlayer.create({
        data: {
          teamId: renterTeam.id,
          playerId,
          isStarter: false,
        },
      });

      await tx.player.update({
        where: { id: playerId },
        data: { isOnRent: false },
      });

      return contract;
    });
  },

  async returnPlayer(app: FastifyInstance, userId: string, playerId: string) {
    const contract = await app.prisma.rentContract.findFirst({
      where: { playerId, status: "ACTIVE" },
    });

    if (!contract)
      throw new Error("No active rent contract found for this player");
    if (contract.renterId !== userId)
      throw new Error("Only the renter can return the player early");

    return app.prisma.$transaction(async (tx) => {
      await tx.teamPlayer.deleteMany({
        where: { playerId, team: { userId: contract.renterId } },
      });

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

      await tx.rentContract.update({
        where: { id: contract.id },
        data: { status: "FINISHED" },
      });

      return tx.player.update({
        where: { id: playerId },
        data: { isOnRent: false, rentPrice: null },
      });
    });
  },

  async recallPlayer(app: FastifyInstance, userId: string, playerId: string) {
    const contract = await app.prisma.rentContract.findFirst({
      where: { playerId, status: "ACTIVE" },
    });

    if (!contract) throw new Error("This player is not currently rented out");
    if (contract.lessorId !== userId)
      throw new Error("Only the owner can recall the player");

    return app.prisma.$transaction(async (tx) => {
      const owner = await tx.user.findUnique({ where: { id: userId } });
      if (!owner || owner.coins < contract.price) {
        throw new Error(
          "Insufficient coins to recall player (need " + contract.price + ")",
        );
      }

      await tx.user.update({
        where: { id: userId },
        data: { coins: { decrement: contract.price } },
      });

      await tx.user.update({
        where: { id: contract.renterId },
        data: { coins: { increment: contract.price } },
      });

      await tx.teamPlayer.deleteMany({
        where: { playerId, team: { userId: contract.renterId } },
      });

      const ownerTeam = await tx.team.findFirst({
        where: { userId: userId, isEvent: false },
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

      await tx.rentContract.update({
        where: { id: contract.id },
        data: { status: "FINISHED" },
      });

      return tx.player.update({
        where: { id: playerId },
        data: { isOnRent: false, rentPrice: null },
      });
    });
  },

  async syncExpiredRentals(app: FastifyInstance) {
    const expiredContracts = await app.prisma.rentContract.findMany({
      where: {
        status: "ACTIVE",
        endDate: { lte: new Date() },
      },
    });

    for (const contract of expiredContracts) {
      try {
        await app.prisma.$transaction(async (tx) => {
          await tx.teamPlayer.deleteMany({
            where: { playerId: contract.playerId },
          });
          const ownerTeam = await tx.team.findFirst({
            where: { userId: contract.lessorId, isEvent: false },
          });
          if (ownerTeam) {
            await tx.teamPlayer.create({
              data: {
                teamId: ownerTeam.id,
                playerId: contract.playerId,
                isStarter: false,
              },
            });
          }
          await tx.rentContract.update({
            where: { id: contract.id },
            data: { status: "FINISHED" },
          });
          await tx.player.update({
            where: { id: contract.playerId },
            data: { isOnRent: false, rentPrice: null },
          });
        });
        app.log.info(`Auto-returned player ${contract.playerId} from rental`);
      } catch (e) {
        app.log.error(
          `Failed to auto-return player ${contract.playerId}: ${e}`,
        );
      }
    }
  },
};

export const checkExpiredRentals = (app: FastifyInstance) =>
  rentService.syncExpiredRentals(app);
