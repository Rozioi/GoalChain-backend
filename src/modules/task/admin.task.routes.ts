import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { adminTaskController } from "./task.controller";
import { adminGuard } from "../admin/admin.routes";


async function adminTaskRoutes(app: FastifyInstance) {
  app.addHook("preHandler", adminGuard);

  app.get(
    "/admin/task",
    {
      schema: {
        tags: ["Admin - Task"],
        description: "List all tasks (admin)",
      },
    },
    adminTaskController.list,
  );

  app.post(
    "/admin/task",
    {
      schema: {
        tags: ["Admin - Task"],
        description: "Create a new task",
        body: {
          type: "object",
          required: ["title", "type", "reward", "goal"],
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            type: { type: "string", enum: ["SEASON", "DAILY", "INTRO"] },
            objective: {
              type: "string",
              enum: ["GOALS", "WINS", "MATCHES", "CLEAN_SHEETS", "REFERRALS"],
            },
            reward: { type: "number" },
            goal: { type: "number" },
            icon: { type: "string" },
          },
        },
      },
    },
    adminTaskController.create,
  );

  app.put(
    "/admin/task/:id",
    {
      schema: {
        tags: ["Admin - Task"],
        description: "Update a task",
        params: { type: "object", properties: { id: { type: "string" } } },
        body: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            type: { type: "string", enum: ["SEASON", "DAILY", "INTRO"] },
            objective: {
              type: "string",
              enum: ["GOALS", "WINS", "MATCHES", "CLEAN_SHEETS", "REFERRALS"],
            },
            reward: { type: "number" },
            goal: { type: "number" },
            icon: { type: "string" },
            isActive: { type: "boolean" },
          },
        },
      },
    },
    adminTaskController.update,
  );

  app.delete(
    "/admin/task/:id",
    {
      schema: {
        tags: ["Admin - Task"],
        description: "Delete a task",
        params: { type: "object", properties: { id: { type: "string" } } },
      },
    },
    adminTaskController.delete,
  );
}

export default adminTaskRoutes;
