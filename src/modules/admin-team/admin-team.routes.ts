import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { adminTeamController } from "./admin-team.controller";

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

export default async function adminTeamRoutes(app: FastifyInstance) {
  app.addHook("preHandler", adminGuard);

  app.get("/admin/teams", adminTeamController.list);
  app.get("/admin/teams/:id", adminTeamController.get);
  app.patch("/admin/teams/:id", adminTeamController.update);
  app.post("/admin/teams/:id/players", adminTeamController.addPlayer);
  app.delete("/admin/teams/:id/players/:playerId", adminTeamController.removePlayer);
}
