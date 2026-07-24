import { FastifyRequest, FastifyReply } from "fastify";
import * as analyticsService from "./analytics.service";
import * as funnelService from "./funnel.service";

export const analyticsController = {
  // ── Online ──
  getOnline: async (request: FastifyRequest, reply: FastifyReply) => {
    const data = await analyticsService.getOnlineMetrics(request.server);
    return reply.send(data);
  },

  // ── Users ──
  getUsers: async (request: FastifyRequest, reply: FastifyReply) => {
    const data = await analyticsService.getUserMetrics(request.server);
    return reply.send(data);
  },

  // ── Retention ──
  getRetention: async (request: FastifyRequest, reply: FastifyReply) => {
    const data = await analyticsService.getRetentionMetrics(request.server);
    return reply.send(data);
  },

  // ── Activity ──
  getActivity: async (request: FastifyRequest, reply: FastifyReply) => {
    const data = await analyticsService.getActivityMetrics(request.server);
    return reply.send(data);
  },

  // ── Scouting ──
  getScouting: async (request: FastifyRequest, reply: FastifyReply) => {
    const data = await analyticsService.getScoutingStats(request.server);
    return reply.send(data);
  },

  // ── NFT ──
  getNft: async (request: FastifyRequest, reply: FastifyReply) => {
    const data = await analyticsService.getNftStats(request.server);
    return reply.send(data);
  },

  // ── Funnels ──
  listFunnels: async (request: FastifyRequest, reply: FastifyReply) => {
    const funnels = await funnelService.listFunnels(request.server);
    return reply.send(funnels);
  },

  createFunnel: async (
    request: FastifyRequest<{ Body: { name: string } }>,
    reply: FastifyReply,
  ) => {
    const funnel = await funnelService.createFunnel(
      request.server,
      request.body.name,
    );
    return reply.status(201).send(funnel);
  },

  deleteFunnel: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await funnelService.deleteFunnel(request.server, request.params.id);
    return reply.send({ success: true });
  },

  // ── Top Users ──
  getTopUsers: async (
    request: FastifyRequest<{
      Querystring: { metric?: string; limit?: string };
    }>,
    reply: FastifyReply,
  ) => {
    const metric = request.query.metric || "coins";
    const limit = parseInt(request.query.limit || "20");
    const users = await analyticsService.getTopUsers(
      request.server,
      metric,
      limit,
    );
    return reply.send(users);
  },

  // ── User Detail ──
  getUserDetail: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    const user = await analyticsService.getUserDetail(
      request.server,
      request.params.id,
    );
    if (!user) return reply.status(404).send({ error: "User not found" });
    return reply.send(user);
  },
};
