"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rentController = rentController;
const rent_service_1 = require("./rent.service");
async function rentController(app) {
    app.addHook("preHandler", app.authenticate);
    app.post("/rent/list", async (req, reply) => {
        const userId = req.user.userId;
        const { playerId, price } = req.body;
        const player = await rent_service_1.rentService.listPlayerForRent(app, userId, playerId, price);
        return player;
    });
    app.get("/rent/available", async (req, reply) => {
        try {
            const userId = req.user.userId;
            const rentals = await app.prisma.player.findMany({
                where: {
                    isOnRent: true,
                    NOT: { ownerId: userId },
                },
                include: { rentContracts: { where: { status: "ACTIVE" } } },
                orderBy: { overallRating: "desc" },
            });
            reply.send(rentals);
        }
        catch (error) {
            reply.status(500).send(error);
        }
    });
    app.post("/rent/execute", async (req, reply) => {
        const userId = req.user.userId;
        const { playerId, days } = req.body;
        const contract = await rent_service_1.rentService.rentPlayer(app, userId, playerId, days || 7);
        return contract;
    });
    app.post("/rent/return", async (req, reply) => {
        const userId = req.user.userId;
        const result = await rent_service_1.rentService.returnPlayer(app, userId, req.body.playerId);
        return result;
    });
    app.post("/rent/recall", async (req, reply) => {
        const userId = req.user.userId;
        const result = await rent_service_1.rentService.recallPlayer(app, userId, req.body.playerId);
        return result;
    });
}
