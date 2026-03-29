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
                required: ["starterIds"],
                properties: {
                    starterIds: {
                        type: "array",
                        items: { type: "string" },
                        minItems: 11,
                        maxItems: 11,
                    },
                    formation: { type: "string" },
                },
            },
        },
    }, team_controller_1.teamController.setLineup);
    app.get("/team/rating", {
        schema: {
            tags: ["Team"],
        },
    }, team_controller_1.teamController.rating);
}
exports.default = teamRoutes;
