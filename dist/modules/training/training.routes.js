"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const training_controller_1 = require("./training.controller");
async function trainingRoutes(app) {
    app.addHook("preHandler", app.authenticate);
    app.post("/training/start", {
        schema: {
            tags: ["Training"],
            body: {
                type: "object",
                required: ["playerId", "stat"],
                properties: {
                    playerId: { type: "string" },
                    stat: {
                        type: "string",
                        enum: ["pace", "shooting", "passing", "dribbling", "defending", "physical"],
                    },
                },
            },
        },
    }, training_controller_1.trainingController.start);
    app.get("/training/cost/:playerId", {
        schema: {
            tags: ["Training"],
        },
    }, training_controller_1.trainingController.cost);
}
exports.default = trainingRoutes;
