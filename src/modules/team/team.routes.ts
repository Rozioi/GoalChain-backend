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
        },
        teamController.setLineup,
    );

    app.get("/team/rating", {
        schema: {
            tags: ["Team"],
        },
    }, teamController.rating);
}

export default teamRoutes;
