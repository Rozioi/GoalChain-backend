import type { FastifyRequest, FastifyReply } from "fastify";
import {
  updateTeam,
  addPlayerToTeam,
  removePlayerFromTeam,
  getTeam,
  searchTeams,
} from "./admin-team.service";

export const adminTeamController = {
  async list(
    req: FastifyRequest<{
      Querystring: { search?: string; skip?: string; take?: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const result = await searchTeams(req.server, {
        search: req.query.search,
        skip: req.query.skip ? parseInt(req.query.skip) : undefined,
        take: req.query.take ? parseInt(req.query.take) : undefined,
      });
      reply.send(result);
    } catch (err: any) {
      reply.status(400).send({ error: err.message });
    }
  },

  async get(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const team = await getTeam(req.server, req.params.id);
      reply.send(team);
    } catch (err: any) {
      reply.status(400).send({ error: err.message });
    }
  },

  async update(
    req: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const team = await updateTeam(req.server, req.params.id, req.body as any);
      reply.send(team);
    } catch (err: any) {
      reply.status(400).send({ error: err.message });
    }
  },

  async addPlayer(
    req: FastifyRequest<{
      Params: { id: string };
      Body: { playerId: string; isStarter?: boolean; positionInFormation?: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { playerId, isStarter, positionInFormation } = req.body;
      const result = await addPlayerToTeam(
        req.server,
        req.params.id,
        playerId,
        isStarter,
        positionInFormation,
      );
      reply.status(201).send(result);
    } catch (err: any) {
      reply.status(400).send({ error: err.message });
    }
  },

  async removePlayer(
    req: FastifyRequest<{ Params: { id: string; playerId: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const result = await removePlayerFromTeam(
        req.server,
        req.params.id,
        req.params.playerId,
      );
      reply.send(result);
    } catch (err: any) {
      reply.status(400).send({ error: err.message });
    }
  },
};
