import { FastifyInstance } from "fastify";
import { taskController } from "./task.controller";

async function taskRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.get(
    "/task/list",
    {
      schema: {
        tags: ["Task"],
        description: "Get all active tasks with user progress",
      },
    },
    taskController.list,
  );

  app.post(
    "/task/claim",
    {
      schema: {
        tags: ["Task"],
        body: {
          type: "object",
          required: ["taskId"],
          properties: {
            taskId: { type: "string" },
          },
        },
      },
    },
    taskController.claim,
  );
}

export default taskRoutes;
