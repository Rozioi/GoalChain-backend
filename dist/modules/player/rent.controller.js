"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rentController = rentController;
const rent_service_1 = require("./rent.service");
async function rentController(app) {
    app.addHook("preHandler", app.authenticate);
    app.post("/rent/list", async (req, reply) => {
        const userId = req.user.userId;
        const { playerId, price, currency } = req.body;
        const player = await (0, rent_service_1.listPlayerForRent)(app, userId, playerId, price, currency);
        return player;
    });
    app.get("/rent/available", async (req, reply) => {
        try {
            const userId = req.user.userId;
            const rentals = await (0, rent_service_1.getAvailableRentals)(app, userId);
            reply.send(rentals);
        }
        catch (error) {
            reply.send(error);
        }
    });
    app.post("/rent/execute", async (req, reply) => {
        const userId = req.user.userId;
        const { playerId, days } = req.body;
        const player = await (0, rent_service_1.rentPlayer)(app, userId, playerId, days);
        return player;
    });
}
