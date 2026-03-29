import { FastifyReply, FastifyRequest } from "fastify";
import {
    startDraft,
    getDraftOptions,
    pickDraftPlayers,
    completeDraft,
} from "./draft.service";

export const draftController = {
    async start(req: FastifyRequest, reply: FastifyReply) {
        try {
            const session = await startDraft(req.server, req.user.userId);
            reply.send(session);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },

    async getOptions(
        req: FastifyRequest<{ Params: { step: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const result = await getDraftOptions(
                req.server,
                req.user.userId,
                req.params.step,
            );
            reply.send(result);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },

    async pick(
        req: FastifyRequest<{ Body: { optionIds: string[] } }>,
        reply: FastifyReply,
    ) {
        try {
            const result = await pickDraftPlayers(
                req.server,
                req.user.userId,
                req.body.optionIds,
            );
            reply.send(result);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },

    async complete(req: FastifyRequest, reply: FastifyReply) {
        try {
            const result = await completeDraft(req.server, req.user.userId);
            reply.send(result);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },
};
