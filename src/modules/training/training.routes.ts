import { FastifyInstance } from "fastify";
import { trainingController } from "./training.controller";

async function trainingRoutes(app: FastifyInstance) {
    app.addHook("preHandler", app.authenticate);

    app.post(
        "/training/start",
        {
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
        },
        trainingController.start,
    );

    app.get("/training/cost/:playerId", {
        schema: {
            tags: ["Training"],
        },
    }, trainingController.cost);
}

export default trainingRoutes;
