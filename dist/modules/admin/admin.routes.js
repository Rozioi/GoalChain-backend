"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminGuard = adminGuard;
const admin_controller_1 = require("./admin.controller");
async function adminGuard(request, reply) {
    try {
        await request.jwtVerify();
    }
    catch (err) {
        return reply.status(401).send({ error: "Unauthorized" });
    }
    const userId = request.user.userId;
    const user = await request.server.prisma.user.findUnique({
        where: { id: userId },
        select: { isAdmin: true },
    });
    if (!user || !user.isAdmin) {
        return reply
            .status(403)
            .send({ error: "Forbidden: Admin access only" });
    }
}
async function adminRoutes(app) {
    app.addHook("preHandler", adminGuard);
    app.get("/admin/stats", admin_controller_1.adminController.stats);
    app.get("/admin/users", admin_controller_1.adminController.listUsers);
    app.get("/admin/seasons", admin_controller_1.adminController.listSeasons);
    app.put("/admin/users/:id", admin_controller_1.adminController.updateUser);
    app.delete("/admin/users/:id", admin_controller_1.adminController.deleteUser);
    app.delete("/admin/users/:id/team", admin_controller_1.adminController.deleteUserTeam);
    app.post("/admin/season", admin_controller_1.adminController.createSeason);
    app.put("/admin/season/:id/status", admin_controller_1.adminController.updateSeason);
    app.put("/admin/season/:id/end", admin_controller_1.adminController.endSeason);
    app.post("/admin/broadcast", {
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
    }, admin_controller_1.adminController.broadcast);
    app.get("/admin/real-players/templates", admin_controller_1.adminController.listRealPlayerTemplates);
    app.get("/admin/real-players/players", admin_controller_1.adminController.listReleasedRealPlayers);
    app.post("/admin/real-players/release/:templateId", admin_controller_1.adminController.releaseRealPlayer);
}
exports.default = adminRoutes;
