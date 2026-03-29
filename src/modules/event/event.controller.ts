import { FastifyReply, FastifyRequest } from "fastify";
import {
    getActiveEvents,
    startEventDraft,
    getEventStandings,
} from "./event.service";

export const eventController = {
    async active(req: FastifyRequest, reply: FastifyReply) {
        try {
            const events = await getActiveEvents(req.server);
            reply.send(events);
        } catch (err: any) {
            reply.status(500).send({ error: err.message });
        }
    },

    async startDraft(
        req: FastifyRequest<{ Body: { eventId: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const draft = await startEventDraft(
                req.server,
                req.user.userId,
                req.body.eventId,
            );
            reply.send(draft);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },

    async standings(
        req: FastifyRequest<{ Params: { eventId: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const result = await getEventStandings(
                req.server,
                req.params.eventId,
            );
            reply.send(result);
        } catch (err: any) {
            reply.status(500).send({ error: err.message });
        }
    },
};
