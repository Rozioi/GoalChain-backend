import { FastifyReply, FastifyRequest } from "fastify";
import {
  startDraft,
  getDraftOptions,
  pickDraftPlayers,
  completeDraft,
} from "./draft.service";
import { AppError } from "../../utils/app-error";

export const draftController = {
  async start(req: FastifyRequest, reply: FastifyReply) {
    try {
      const session = await startDraft(req.server, req.user.userId);
      reply.send(session);
    } catch (err: any) {
      req.server.log.error({ err }, "draft.start error");
      if (err instanceof AppError) {
        reply.status(err.statusCode).send({ error: err.message });
      } else {
        reply.status(500).send({ error: "Failed to start draft" });
      }
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
      // prevent browser caching for dynamic draft data and ensure caches vary by auth
      reply.header(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, max-age=0",
      );
      reply.header("Vary", "Authorization");
      reply.send(result);
    } catch (err: any) {
      req.server.log.error({ err }, "draft.getOptions error");
      if (err instanceof AppError) {
        reply.status(err.statusCode).send({ error: err.message });
      } else {
        reply.status(500).send({ error: "Failed to get draft options" });
      }
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
      // pick is state-mutating; prevent caching and ensure cache varies by Authorization
      reply.header(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, max-age=0",
      );
      reply.header("Vary", "Authorization");
      reply.send(result);
    } catch (err: any) {
      req.server.log.error({ err }, "draft.pick error");
      if (err instanceof AppError) {
        reply.status(err.statusCode).send({ error: err.message });
      } else {
        reply.status(500).send({ error: "Failed to pick draft players" });
      }
    }
  },

  async complete(
    req: FastifyRequest<{ Body: { clubName?: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const { clubName } = req.body || {};
      const result = await completeDraft(req.server, req.user.userId, clubName);
      reply.send(result);
    } catch (err: any) {
      req.server.log.error({ err }, "draft.complete error");
      if (err instanceof AppError) {
        reply.status(err.statusCode).send({ error: err.message });
      } else {
        reply.status(500).send({ error: "Failed to complete draft" });
      }
    }
  },
};
