import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { rentService } from "./rent.service";

export async function rentController(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.post(
    "/rent/list",
    async (
      req: FastifyRequest<{
        Body: { playerId: string; price: number };
      }>,
      reply: FastifyReply,
    ) => {
      const userId = (req.user as any).userId;
      const { playerId, price } = req.body;
      const player = await rentService.listPlayerForRent(
        app,
        userId,
        playerId,
        price,
      );
      return player;
    },
  );

  app.get("/rent/available", async (req, reply) => {
    try {
      const userId = (req.user as any).userId;
      const rentals = await app.prisma.player.findMany({
        where: {
          isOnRent: true,
          NOT: { ownerId: userId },
        },
        include: { rentContracts: { where: { status: "ACTIVE" } } },
        orderBy: { overallRating: "desc" },
      });
      reply.send(rentals);
    } catch (error) {
      reply.status(500).send(error);
    }
  });

  app.post(
    "/rent/execute",
    async (
      req: FastifyRequest<{ Body: { playerId: string; days?: number } }>,
      reply: FastifyReply,
    ) => {
      const userId = (req.user as any).userId;
      const { playerId, days } = req.body;
      const contract = await rentService.rentPlayer(
        app,
        userId,
        playerId,
        days || 7,
      );
      return contract;
    },
  );

  app.post(
    "/rent/return",
    async (
      req: FastifyRequest<{ Body: { playerId: string } }>,
      reply: FastifyReply,
    ) => {
      const userId = (req.user as any).userId;
      const result = await rentService.returnPlayer(app, userId, req.body.playerId);
      return result;
    },
  );

  app.post(
    "/rent/recall",
    async (
      req: FastifyRequest<{ Body: { playerId: string } }>,
      reply: FastifyReply,
    ) => {
      const userId = (req.user as any).userId;
      const result = await rentService.recallPlayer(app, userId, req.body.playerId);
      return result;
    },
  );
}
