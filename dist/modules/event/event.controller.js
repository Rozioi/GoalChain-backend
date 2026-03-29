"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventController = void 0;
const event_service_1 = require("./event.service");
exports.eventController = {
    async active(req, reply) {
        try {
            const events = await (0, event_service_1.getActiveEvents)(req.server);
            reply.send(events);
        }
        catch (err) {
            reply.status(500).send({ error: err.message });
        }
    },
    async startDraft(req, reply) {
        try {
            const draft = await (0, event_service_1.startEventDraft)(req.server, req.user.userId, req.body.eventId);
            reply.send(draft);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
    async standings(req, reply) {
        try {
            const result = await (0, event_service_1.getEventStandings)(req.server, req.params.eventId);
            reply.send(result);
        }
        catch (err) {
            reply.status(500).send({ error: err.message });
        }
    },
};
