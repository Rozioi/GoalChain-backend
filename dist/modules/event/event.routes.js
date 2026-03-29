"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const event_controller_1 = require("./event.controller");
async function eventRoutes(app) {
    app.addHook("preHandler", app.authenticate);
    app.get("/event/active", {
        schema: {
            tags: ["Event"],
        },
    }, event_controller_1.eventController.active);
    app.post("/event/draft/start", {
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
    }, event_controller_1.eventController.startDraft);
    app.get("/event/standings/:eventId", {
        schema: {
            tags: ["Event"],
        },
    }, event_controller_1.eventController.standings);
}
exports.default = eventRoutes;
