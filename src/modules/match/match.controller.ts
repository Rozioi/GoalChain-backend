import { FastifyReply, FastifyRequest } from "fastify";
import {
  playFriendlyMatch,
  playBotMatch,
  inviteFriend,
  acceptMatch,
  getMatchHistory,
  updateMatchTactics,
  createOpenChallenge,
  getMatchById,
} from "./match.service";

const matchController = {
  async friendly(req: FastifyRequest, reply: FastifyReply) {
    try {
      const result = await playFriendlyMatch(req.server, req.user.userId);
      reply.send(result);
    } catch (err: any) {
      reply.status(400).send({ error: err.message });
    }
  },

  async bot(req: FastifyRequest, reply: FastifyReply) {
    try {
      const result = await playBotMatch(req.server, req.user.userId);
      reply.send(result);
    } catch (err: any) {
      reply.status(400).send({ error: err.message });
    }
  },

  async invite(
    req: FastifyRequest<{ Params: { friendId: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const result = await inviteFriend(
        req.server,
        req.user.userId,
        req.params.friendId,
      );
      reply.send(result);
    } catch (err: any) {
      reply.status(400).send({ error: err.message });
    }
  },

  async createInvite(req: FastifyRequest, reply: FastifyReply) {
    try {
      const result = await createOpenChallenge(req.server, req.user.userId);
      reply.send(result);
    } catch (err: any) {
      reply.status(400).send({ error: err.message });
    }
  },

  async accept(
    req: FastifyRequest<{ Params: { matchId: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const result = await acceptMatch(
        req.server,
        req.user.userId,
        req.params.matchId,
      );
      console.log("dsadad", req.params.matchId, result);
      reply.send(result);
    } catch (err: any) {
      reply.status(400).send({ error: err.message });
    }
  },

  async history(req: FastifyRequest, reply: FastifyReply) {
    try {
      const matches = await getMatchHistory(req.server, req.user.userId);
      reply.send(matches);
    } catch (err: any) {
      reply.status(500).send({ error: err.message });
    }
  },

  async updateTactics(
    req: FastifyRequest<{
      Params: { matchId: string };
      Body: {
        pressingType?: "SOFT" | "MEDIUM" | "INTENSIVE";
        substitution?: { outId: string; inId: string };
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const result = await updateMatchTactics(
        req.server,
        req.params.matchId,
        req.user.userId,
        req.body,
      );
      reply.send(result);
    } catch (err: any) {
      reply.status(400).send({ error: err.message });
    }
  },
  
  async get(
    req: FastifyRequest<{ Params: { matchId: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const matchData = await getMatchById(req.server, req.params.matchId);
      if (!matchData) {
        return reply.status(404).send({ error: "Match not found" });
      }
      reply.send(matchData);
    } catch (err: any) {
      reply.status(500).send({ error: err.message });
    }
  },
};

export default matchController;
