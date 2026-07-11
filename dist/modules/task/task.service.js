"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTasksForUser = getTasksForUser;
exports.claimTask = claimTask;
exports.updateTaskProgress = updateTaskProgress;
exports.createTask = createTask;
exports.updateTask = updateTask;
exports.deleteTask = deleteTask;
exports.getAllTasks = getAllTasks;
function isSameDay(d1, d2) {
    return (d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate());
}
async function getTasksForUser(app, userId) {
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
        if (userTask &&
            task.type === "DAILY" &&
            !isSameDay(userTask.updatedAt, now)) {
            userTask = await app.prisma.userTask.update({
                where: { id: userTask.id },
                data: { progress: 0, claimed: false, claimedAt: null },
            });
        }
        results.push({
            id: task.id,
            title: task.title,
            description: task.description,
            titleRu: task.titleRu,
            descriptionRu: task.descriptionRu,
            titleEn: task.titleEn,
            descriptionEn: task.descriptionEn,
            type: task.type,
            objective: task.objective,
            reward: task.reward,
            goal: task.goal,
            icon: task.icon,
            link: task.link,
            progress: userTask?.progress ?? 0,
            claimed: userTask?.claimed ?? false,
            claimedAt: userTask?.claimedAt ?? null,
        });
    }
    return results;
}
async function claimTask(app, userId, taskId) {
    const task = await app.prisma.task.findUnique({ where: { id: taskId } });
    if (!task)
        throw new Error("Task not found");
    const userTask = await app.prisma.userTask.findUnique({
        where: { userId_taskId: { userId, taskId } },
    });
    if (!userTask)
        throw new Error("No progress tracked for this task");
    if (userTask.claimed)
        throw new Error("Reward already claimed");
    if (userTask.progress < task.goal)
        throw new Error("Task not completed yet");
    await app.prisma.$transaction([
        app.prisma.userTask.update({
            where: { userId_taskId: { userId, taskId } },
            data: { claimed: true, claimedAt: new Date() },
        }),
        app.prisma.user.update({
            where: { id: userId },
            data: { coins: { increment: task.reward } },
        }),
        app.prisma.economyLog.create({
            data: {
                userId,
                amount: task.reward,
                source: "TASK_REWARD",
                details: { taskId },
            },
        }),
    ]);
    return { success: true, reward: task.reward };
}
async function updateTaskProgress(app, userId, objective, increment = 1) {
    const now = new Date();
    const activeTasks = await app.prisma.task.findMany({
        where: { objective, isActive: true },
    });
    if (activeTasks.length === 0)
        return;
    const taskIds = activeTasks.map((t) => t.id);
    const existingUserTasks = await app.prisma.userTask.findMany({
        where: { userId, taskId: { in: taskIds } },
    });
    const updates = [];
    for (const task of activeTasks) {
        const ut = existingUserTasks.find((u) => u.taskId === task.id);
        if (ut) {
            const isDailyReset = task.type === "DAILY" && !isSameDay(ut.updatedAt, now);
            updates.push(app.prisma.userTask.update({
                where: { id: ut.id },
                data: {
                    progress: isDailyReset ? increment : { increment },
                    claimed: isDailyReset ? false : undefined,
                    claimedAt: isDailyReset ? null : undefined,
                },
            }));
        }
        else {
            updates.push(app.prisma.userTask.create({
                data: { userId, taskId: task.id, progress: increment },
            }));
        }
    }
    if (updates.length > 0) {
        await app.prisma.$transaction(updates);
    }
}
async function createTask(app, data) {
    return app.prisma.task.create({ data });
}
async function updateTask(app, taskId, data) {
    return app.prisma.task.update({ where: { id: taskId }, data });
}
async function deleteTask(app, taskId) {
    await app.prisma.userTask.deleteMany({ where: { taskId } });
    return app.prisma.task.delete({ where: { id: taskId } });
}
async function getAllTasks(app) {
    return app.prisma.task.findMany({ orderBy: { createdAt: "desc" } });
}
