import { FastifyRequest, FastifyReply } from "fastify";
import * as taskService from "./task.service";
import { TaskType, TaskObjective } from "@prisma/client";

export const taskController = {
  list: async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request.user as any).id;
    const tasks = await taskService.getTasksForUser(request.server, userId);
    return reply.send(tasks);
  },

  claim: async (
    request: FastifyRequest<{ Body: { taskId: string } }>,
    reply: FastifyReply,
  ) => {
    const userId = (request.user as any).id;
    const { taskId } = request.body;
    const result = await taskService.claimTask(request.server, userId, taskId);
    return reply.send(result);
  },
};

export const adminTaskController = {
  list: async (_request: FastifyRequest, reply: FastifyReply) => {
    const tasks = await taskService.getAllTasks(_request.server);
    return reply.send(tasks);
  },

  create: async (
    request: FastifyRequest<{
      Body: {
        title: string;
        description?: string;
        type: string;
        objective?: string;
        reward: number;
        goal: number;
        icon?: string;
      };
    }>,
    reply: FastifyReply,
  ) => {
    const task = await taskService.createTask(request.server, {
      ...request.body,
      type: request.body.type as TaskType,
      objective: request.body.objective as TaskObjective | undefined,
    });
    return reply.status(201).send(task);
  },

  update: async (
    request: FastifyRequest<{
      Params: { id: string };
      Body: {
        title?: string;
        description?: string;
        type?: string;
        objective?: string;
        reward?: number;
        goal?: number;
        icon?: string;
        isActive?: boolean;
      };
    }>,
    reply: FastifyReply,
  ) => {
    const task = await taskService.updateTask(
      request.server,
      request.params.id,
      { 
        ...request.body, 
        type: request.body.type as TaskType | undefined,
        objective: request.body.objective as TaskObjective | undefined
      },
    );
    return reply.send(task);
  },

  delete: async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) => {
    await taskService.deleteTask(request.server, request.params.id);
    return reply.send({ success: true });
  },
};
