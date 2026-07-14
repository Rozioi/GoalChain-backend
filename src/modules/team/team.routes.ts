import { FastifyInstance } from "fastify";
import { teamController } from "./team.controller";

async function teamRoutes(app: FastifyInstance) {
    app.addHook("preHandler", app.authenticate);

    app.get("/team/my", {
        schema: {
            tags: ["Team"],
        },
    }, teamController.myTeam);

    app.put(
        "/team/lineup",
        {
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
        },
        teamController.setLineup,
    );

    app.post(
        "/team/substitute",
        {
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
        },
        teamController.substitute,
    );

    app.get("/team/rating", {
        schema: {
            tags: ["Team"],
        },
    }, teamController.rating);
}

export default teamRoutes;
