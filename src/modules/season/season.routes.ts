import { FastifyInstance } from "fastify";
import { seasonController } from "./season.controller";

async function seasonRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get(
    "/season/current",
    {
      schema: {
        tags: ["Season"],
      },
    },
    seasonController.current,
  );
  app.get(
    "/season/standings/:seasonId",
    {
      schema: {
        tags: ["Season"],
      },
    },
    seasonController.standings,
  );
  app.post(
    "/season/register",
    {
      schema: {
        tags: ["Season"],
      },
    },
    seasonController.register,
  );
  app.post(
    "/season/play",
    {
      schema: {
        tags: ["Season"],
        summary: "Сыграть сезонный матч",
      },
    },
    seasonController.play,
  );
}

export default seasonRoutes;
