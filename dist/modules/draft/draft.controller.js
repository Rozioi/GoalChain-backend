"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.draftController = void 0;
const draft_service_1 = require("./draft.service");
const app_error_1 = require("../../utils/app-error");
exports.draftController = {
    async start(req, reply) {
        try {
            const session = await (0, draft_service_1.startDraft)(req.server, req.user.userId);
            reply.send(session);
        }
        catch (err) {
            req.server.log.error({ err }, "draft.start error");
            if (err instanceof app_error_1.AppError) {
                reply.status(err.statusCode).send({ error: err.message });
            }
            else {
                reply.status(500).send({ error: "Failed to start draft" });
            }
        }
    },
    async getOptions(req, reply) {
        try {
            const result = await (0, draft_service_1.getDraftOptions)(req.server, req.user.userId, req.params.step);
            // prevent browser caching for dynamic draft data and ensure caches vary by auth
            reply.header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
            reply.header("Vary", "Authorization");
            reply.send(result);
        }
        catch (err) {
            req.server.log.error({ err }, "draft.getOptions error");
            if (err instanceof app_error_1.AppError) {
                reply.status(err.statusCode).send({ error: err.message });
            }
            else {
                reply.status(500).send({ error: "Failed to get draft options" });
            }
        }
    },
    async pick(req, reply) {
        try {
            const result = await (0, draft_service_1.pickDraftPlayers)(req.server, req.user.userId, req.body.optionIds);
            // pick is state-mutating; prevent caching and ensure cache varies by Authorization
            reply.header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
            reply.header("Vary", "Authorization");
            reply.send(result);
        }
        catch (err) {
            req.server.log.error({ err }, "draft.pick error");
            if (err instanceof app_error_1.AppError) {
                reply.status(err.statusCode).send({ error: err.message });
            }
            else {
                reply.status(500).send({ error: "Failed to pick draft players" });
            }
        }
    },
    async complete(req, reply) {
        try {
            const { clubName } = req.body || {};
            const result = await (0, draft_service_1.completeDraft)(req.server, req.user.userId, clubName);
            reply.send(result);
        }
        catch (err) {
            req.server.log.error({ err }, "draft.complete error");
            if (err instanceof app_error_1.AppError) {
                reply.status(err.statusCode).send({ error: err.message });
            }
            else {
                reply.status(500).send({ error: "Failed to complete draft" });
            }
        }
    },
};
