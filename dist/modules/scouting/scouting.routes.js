"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scouting_controller_1 = require("./scouting.controller");
async function scoutingRoutes(app) {
    app.addHook("preHandler", app.authenticate);
    app.post("/scout/hire", {
        schema: {
            tags: ["Scouting"],
            body: {
                type: "object",
                required: ["region"],
                properties: {
                    region: { type: "string" },
                    targetRole: {
                        type: "string",
                        enum: ["GOALKEEPER", "DEFENDER", "MIDFIELDER", "FORWARD"],
                    },
                    ageMin: { type: "number", minimum: 16, maximum: 40 },
                    ageMax: { type: "number", minimum: 16, maximum: 40 },
                },
            },
        },
    }, scouting_controller_1.scoutingController.hire);
    app.get("/scout/results", {
        schema: {
            tags: ["Scouting"],
        },
    }, scouting_controller_1.scoutingController.results);
    app.post("/scout/collect/:scoutId", {
        schema: {
            tags: ["Scouting"],
        },
    }, scouting_controller_1.scoutingController.collect);
}
exports.default = scoutingRoutes;
