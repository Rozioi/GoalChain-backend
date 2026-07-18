import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { adminPlayerController } from "./admin-player.controller";

async function adminGuard(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  const userId = (request.user as any).userId;
  const user = await (request.server as any).prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  if (!user || !user.isAdmin) {
    return reply.status(403).send({ error: "Forbidden: Admin access only" });
  }
}

export default async function adminPlayerRoutes(app: FastifyInstance) {
  app.addHook("preHandler", adminGuard);

  app.get("/admin/players", adminPlayerController.list);
  app.patch("/admin/players/:id", adminPlayerController.update);
  app.post("/admin/players/:id/reissue-card", adminPlayerController.reissueCard);
}
