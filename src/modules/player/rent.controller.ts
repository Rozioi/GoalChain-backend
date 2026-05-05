import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  listPlayerForRent,
  getAvailableRentals,
  rentPlayer,
} from "./rent.service";

export async function rentController(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.post(
    "/rent/list",
    async (
      req: FastifyRequest<{
        Body: { playerId: string; price: number; currency: "COIN" | "TON" };
      }>,
      reply: FastifyReply,
    ) => {
      const userId = (req.user as any).userId;
      const { playerId, price, currency } = req.body;
      const player = await listPlayerForRent(
        app,
        userId,
        playerId,
        price,
        currency,
      );
      return player;
    },
  );

  app.get("/rent/available", async (req, reply) => {
    try {
      const userId = (req.user as any).userId;
      const rentals = await getAvailableRentals(app, userId);
      reply.send(rentals);
    } catch (error) {
      reply.send(error);
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
      const player = await rentPlayer(app, userId, playerId, days);
      return player;
    },
  );
}
