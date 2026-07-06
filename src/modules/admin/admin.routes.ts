import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { adminController } from "./admin.controller";

export async function adminGuard(request: FastifyRequest, reply: FastifyReply) {
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

async function adminRoutes(app: FastifyInstance) {
    app.addHook("preHandler", adminGuard);

    app.get("/admin/stats", adminController.stats);

    app.get("/admin/users", adminController.listUsers);
    app.get("/admin/seasons", adminController.listSeasons);

    app.put("/admin/users/:id", adminController.updateUser);

    app.delete("/admin/users/:id", adminController.deleteUser);
    app.delete("/admin/users/:id/team", adminController.deleteUserTeam);

    app.post("/admin/season", adminController.createSeason);

    app.put("/admin/season/:id/status", adminController.updateSeason);
    app.put("/admin/season/:id/end", adminController.endSeason);

    app.post(
        "/admin/broadcast",
        {
            schema: {
                tags: ["Admin"],
                summary: "Broadcast message to all Telegram users",
                body: {
                    type: "object",
                    required: ["text"],
                    properties: {
                        text: { type: "string" },
                        photoBase64: { type: "string" },
                    },
                },
            },
        },
        adminController.broadcast,
    );
}

export default adminRoutes;
