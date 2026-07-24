import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { analyticsController } from "./analytics.controller";

async function adminGuard(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  const userId = (request.user as any).userId;
  const user = await (request.server as any).prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  if (!user || !user.isAdmin) {
    return reply
      .status(403)
      .send({ error: "Forbidden: Admin access only" });
  }
}

async function analyticsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", adminGuard);

  // ── Online / Load ──
  app.get("/admin/metrics/online", analyticsController.getOnline);

  // ── Users Metrics ──
  app.get("/admin/metrics/users", analyticsController.getUsers);

  // ── Retention ──
  app.get("/admin/metrics/retention", analyticsController.getRetention);

  // ── Activity ──
  app.get("/admin/metrics/activity", analyticsController.getActivity);

  // ── Scouting ──
  app.get("/admin/metrics/scouting", analyticsController.getScouting);

  // ── NFT ──
  app.get("/admin/metrics/nft", analyticsController.getNft);

  // ── Ad Funnels ──
  app.get("/admin/ads/funnels", analyticsController.listFunnels);
  app.post("/admin/ads/funnels", analyticsController.createFunnel);
  app.delete("/admin/ads/funnels/:id", analyticsController.deleteFunnel);

  // ── Top Users ──
  app.get("/admin/users/top", analyticsController.getTopUsers);

  // ── User Detail ──
  app.get("/admin/users/:id/detail", analyticsController.getUserDetail);
}

export default analyticsRoutes;
