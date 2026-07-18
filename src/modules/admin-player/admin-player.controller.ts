import type { FastifyRequest, FastifyReply } from "fastify";
import { updatePlayer, reissuePlayerCard, searchPlayers } from "./admin-player.service";

export const adminPlayerController = {
  async update(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const player = await updatePlayer(req.server, req.params.id, req.body as any);
      reply.send(player);
    } catch (err: any) {
      reply.status(400).send({ error: err.message });
    }
  },

  async reissueCard(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const imageUrl = await reissuePlayerCard(req.server, req.params.id);
      reply.send({ imageUrl });
    } catch (err: any) {
      reply.status(400).send({ error: err.message });
    }
  },

  async list(
    req: FastifyRequest<{
      Querystring: { search?: string; skip?: string; take?: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const result = await searchPlayers(req.server, {
        search: req.query.search,
        skip: req.query.skip ? parseInt(req.query.skip) : undefined,
        take: req.query.take ? parseInt(req.query.take) : undefined,
      });
      reply.send(result);
    } catch (err: any) {
      reply.status(400).send({ error: err.message });
    }
  },
};
