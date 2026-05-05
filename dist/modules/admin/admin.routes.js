"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin_controller_1 = require("./admin.controller");
async function adminGuard(request, reply) {
    // 1. Ensure authenticated
    try {
        await request.jwtVerify();
    }
    catch (err) {
        return reply.status(401).send({ error: "Unauthorized" });
    }
    // 2. Check isAdmin in DB
    const userId = request.user.userId;
    const user = await request.server.prisma.user.findUnique({
        where: { id: userId },
        select: { isAdmin: true },
    });
    if (!user || !user.isAdmin) {
        return reply.status(403).send({ error: "Forbidden: Admin access only" });
    }
}
async function adminRoutes(app) {
    app.addHook("preHandler", adminGuard);
    app.get("/admin/stats", admin_controller_1.adminController.stats);
    app.get("/admin/users", admin_controller_1.adminController.listUsers);
    app.get("/admin/seasons", admin_controller_1.adminController.listSeasons);
    app.put("/admin/users/:id", admin_controller_1.adminController.updateUser);
    app.post("/admin/season", admin_controller_1.adminController.createSeason);
    app.put("/admin/season/:id/status", admin_controller_1.adminController.updateSeason);
    app.put("/admin/season/:id/end", admin_controller_1.adminController.endSeason);
}
exports.default = adminRoutes;
