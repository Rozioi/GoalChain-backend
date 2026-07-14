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
        },
        trainingController.start,
    );

    app.get("/training/cost/:playerId", {
        schema: {
            tags: ["Training"],
        },
    }, trainingController.cost);

    app.get("/training/complexes/:playerId", {
        schema: {
            tags: ["Training"],
        },
    }, trainingController.complexes);
}

export default trainingRoutes;
