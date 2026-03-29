"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.draftController = void 0;
const draft_service_1 = require("./draft.service");
exports.draftController = {
    async start(req, reply) {
        try {
            const session = await (0, draft_service_1.startDraft)(req.server, req.user.userId);
            reply.send(session);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
    async getOptions(req, reply) {
        try {
            const result = await (0, draft_service_1.getDraftOptions)(req.server, req.user.userId, req.params.step);
            reply.send(result);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
    async pick(req, reply) {
        try {
            const result = await (0, draft_service_1.pickDraftPlayers)(req.server, req.user.userId, req.body.optionIds);
            reply.send(result);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
    async complete(req, reply) {
        try {
            const result = await (0, draft_service_1.completeDraft)(req.server, req.user.userId);
            reply.send(result);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
};
