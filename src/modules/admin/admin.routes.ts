import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { adminController } from "./admin.controller";

async function adminGuard(request: FastifyRequest, reply: FastifyReply) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) {
    return reply.status(403).send({ error: "Admin access not configured" });
  }
  const provided = request.headers["x-admin-token"];
  if (provided !== adminToken) {
    return reply.status(403).send({ error: "Forbidden" });
  }
}

async function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", adminGuard);

  app.get("/admin/stats", adminController.stats);

  app.get("/admin/users", adminController.listUsers);

  app.put("/admin/users/:id", adminController.updateUser);

  app.post("/admin/season", adminController.createSeason);

  app.put("/admin/season/:id/status", adminController.updateSeason);
}

export default adminRoutes;
