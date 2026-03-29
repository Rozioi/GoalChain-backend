import { FastifyInstance } from "fastify";
import { eventController } from "./event.controller";

async function eventRoutes(app: FastifyInstance) {
    app.addHook("preHandler", app.authenticate);

    app.get("/event/active", {
        schema: {
            tags: ["Event"],
        },
    }, eventController.active);

    app.post(
        "/event/draft/start",
        {
            schema: {
                tags: ["Event"],
                body: {
                    type: "object",
                    required: ["eventId"],
                    properties: {
                        eventId: { type: "string" },
                    },
                },
            },
        },
        eventController.startDraft,
    );

    app.get("/event/standings/:eventId", {
        schema: {
            tags: ["Event"],
        },
    }, eventController.standings);
}

export default eventRoutes;
