import { FastifyInstance } from "fastify";
import { scoutingController } from "./scouting.controller";

async function scoutingRoutes(app: FastifyInstance) {
    app.addHook("preHandler", app.authenticate);

    app.post(
        "/scout/hire",
        {
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
        },
        scoutingController.hire,
    );

    app.get("/scout/results", {
        schema: {
            tags: ["Scouting"],
        },
    }, scoutingController.results);

    app.post("/scout/collect/:scoutId", {
        schema: {
            tags: ["Scouting"],
        },
    }, scoutingController.collect);
}

export default scoutingRoutes;
