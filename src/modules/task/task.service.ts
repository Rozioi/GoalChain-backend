import { FastifyInstance } from "fastify";
import { TaskType, TaskObjective } from "@prisma/client";

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}
export async function getTasksForUser(app: FastifyInstance, userId: string) {
  const now = new Date();

  const tasks = await app.prisma.task.findMany({
    where: { isActive: true },
    include: {
      userTasks: {
        where: { userId },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const results = [];
  for (const task of tasks) {
    let userTask = task.userTasks[0] ?? null;

    // Daily Reset Logic
    if (
      userTask &&
      task.type === "DAILY" &&
      !isSameDay(userTask.updatedAt, now)
    ) {
      userTask = await app.prisma.userTask.update({
        where: { id: userTask.id },
        data: { progress: 0, claimed: false, claimedAt: null },
      });
    }

    results.push({
      id: task.id,
      title: task.title,
      description: task.description,
      type: task.type,
      objective: task.objective,
      reward: task.reward,
      goal: task.goal,
      icon: task.icon,
      progress: userTask?.progress ?? 0,
      claimed: userTask?.claimed ?? false,
      claimedAt: userTask?.claimedAt ?? null,
    });
  }

  return results;
}

export async function claimTask(
  app: FastifyInstance,
  userId: string,
  taskId: string,
) {
  const task = await app.prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");

  const userTask = await app.prisma.userTask.findUnique({
    where: { userId_taskId: { userId, taskId } },
  });

  if (!userTask) throw new Error("No progress tracked for this task");
  if (userTask.claimed) throw new Error("Reward already claimed");
  if (userTask.progress < task.goal) throw new Error("Task not completed yet");

  // Award coins and mark as claimed
  await app.prisma.$transaction([
    app.prisma.userTask.update({
      where: { userId_taskId: { userId, taskId } },
      data: { claimed: true, claimedAt: new Date() },
    }),
    app.prisma.user.update({
      where: { id: userId },
      data: { coins: { increment: task.reward } },
    }),
  ]);

  return { success: true, reward: task.reward };
}

export async function updateTaskProgress(
  app: FastifyInstance,
  userId: string,
  objective: TaskObjective,
  increment: number = 1,
) {
  const now = new Date();

  // Find all active tasks with this objective
  const activeTasks = await app.prisma.task.findMany({
    where: { objective, isActive: true },
  });

  if (activeTasks.length === 0) return;

  const taskIds = activeTasks.map((t) => t.id);
  const existingUserTasks = await app.prisma.userTask.findMany({
    where: { userId, taskId: { in: taskIds } },
  });

  const updates = [];
  for (const task of activeTasks) {
    const ut = existingUserTasks.find((u) => u.taskId === task.id);

    if (ut) {
      const isDailyReset =
        task.type === "DAILY" && !isSameDay(ut.updatedAt, now);
      updates.push(
        app.prisma.userTask.update({
          where: { id: ut.id },
          data: {
            progress: isDailyReset ? increment : { increment },
            claimed: isDailyReset ? false : undefined,
            claimedAt: isDailyReset ? null : undefined,
          },
        }),
      );
    } else {
      updates.push(
        app.prisma.userTask.create({
          data: { userId, taskId: task.id, progress: increment },
        }),
      );
    }
  }

  if (updates.length > 0) {
    await app.prisma.$transaction(updates);
  }
}
// ----------- ADMIN METHODS -----------

export async function createTask(
  app: FastifyInstance,
  data: {
    title: string;
    description?: string;
    type: TaskType;
    objective?: TaskObjective;
    reward: number;
    goal: number;
    icon?: string;
  },
) {
  return app.prisma.task.create({ data });
}

export async function updateTask(
  app: FastifyInstance,
  taskId: string,
  data: Partial<{
    title: string;
    description: string;
    type: TaskType;
    objective: TaskObjective;
    reward: number;
    goal: number;
    icon: string;
    isActive: boolean;
  }>,
) {
  return app.prisma.task.update({ where: { id: taskId }, data });
}

export async function deleteTask(app: FastifyInstance, taskId: string) {
  // Delete related userTasks first due to FK
  await app.prisma.userTask.deleteMany({ where: { taskId } });
  return app.prisma.task.delete({ where: { id: taskId } });
}

export async function getAllTasks(app: FastifyInstance) {
  return app.prisma.task.findMany({ orderBy: { createdAt: "desc" } });
}
