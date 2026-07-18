"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const team_controller_1 = require("./team.controller");
async function teamRoutes(app) {
    app.addHook("preHandler", app.authenticate);
    app.get("/team/my", {
        schema: {
            tags: ["Team"],
        },
    }, team_controller_1.teamController.myTeam);
    app.put("/team/lineup", {
        schema: {
            tags: ["Team"],
            body: {
                type: "object",
                required: ["starters"],
                properties: {
                    starters: {
                        type: "array",
                        items: {
                            type: "object",
                            required: ["playerId", "slotKey"],
                            properties: {
                                playerId: { type: "string" },
                                slotKey: { type: "string" },
                            },
                        },
                        minItems: 11,
                        maxItems: 11,
                    },
                    formation: { type: "string" },
                },
            },
        },
    }, team_controller_1.teamController.setLineup);
    app.post("/team/substitute", {
        schema: {
            tags: ["Team"],
            body: {
                type: "object",
                required: ["outPlayerId", "inPlayerId", "slotKey"],
                properties: {
                    outPlayerId: { type: "string" },
                    inPlayerId: { type: "string" },
                    slotKey: { type: "string" },
                },
            },
        },
    }, team_controller_1.teamController.substitute);
    app.get("/team/rating", {
        schema: {
            tags: ["Team"],
        },
    }, team_controller_1.teamController.rating);
}
exports.default = teamRoutes;
