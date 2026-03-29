import { FastifyInstance } from "fastify";
import { draftController } from "./draft.controller";

async function draftRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.post("/draft/start", {
    schema: {
      tags: ["Draft"],
    },
  }, draftController.start);

  app.get(
    "/draft/options/:step",
    {
      schema: {
        tags: ["Draft"],
        params: {
          type: "object",
          required: ["step"],
          properties: {
            step: { type: "string", enum: ["gk", "def", "mid", "fwd"] },
          },
        },
      },
    },
    draftController.getOptions,
  );

  app.post(
    "/draft/pick",
    {
      schema: {
        tags: ["Draft"],
        body: {
          type: "object",
          required: ["optionIds"],
          properties: {
            optionIds: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
    },
    draftController.pick,
  );

  app.post("/draft/complete", {
    schema: {
      tags: ["Draft"],
    },
  }, draftController.complete);
}

export default draftRoutes;
