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
                required: ["playerId", "complexId"],
                properties: {
                    playerId: { type: "string" },
                    complexId: {
                        type: "string",
                        enum: ["PHYSICAL", "TECHNIQUE", "ATTACK", "DEFENSE"],
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
    app.get("/training/complexes/:playerId", {
        schema: {
            tags: ["Training"],
        },
    }, training_controller_1.trainingController.complexes);
}
exports.default = trainingRoutes;
