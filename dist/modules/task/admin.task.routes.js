"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const task_controller_1 = require("./task.controller");
// Simple admin middleware: checks X-Admin-Token header against env
async function adminGuard(request, reply) {
    const adminToken = process.env.ADMIN_TOKEN;
    if (!adminToken) {
        return reply.status(403).send({ error: "Admin access not configured" });
    }
    const provided = request.headers["x-admin-token"];
    if (provided !== adminToken) {
        return reply.status(403).send({ error: "Forbidden" });
    }
}
async function adminTaskRoutes(app) {
    app.addHook("preHandler", adminGuard);
    app.get("/admin/task", {
        schema: {
            tags: ["Admin - Task"],
            description: "List all tasks (admin)",
        },
    }, task_controller_1.adminTaskController.list);
    app.post("/admin/task", {
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
                    objective: { type: "string", enum: ["GOALS", "WINS", "MATCHES", "CLEAN_SHEETS", "REFERRALS"] },
                    reward: { type: "number" },
                    goal: { type: "number" },
                    icon: { type: "string" },
                },
            },
        },
    }, task_controller_1.adminTaskController.create);
    app.put("/admin/task/:id", {
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
                    objective: { type: "string", enum: ["GOALS", "WINS", "MATCHES", "CLEAN_SHEETS", "REFERRALS"] },
                    reward: { type: "number" },
                    goal: { type: "number" },
                    icon: { type: "string" },
                    isActive: { type: "boolean" },
                },
            },
        },
    }, task_controller_1.adminTaskController.update);
    app.delete("/admin/task/:id", {
        schema: {
            tags: ["Admin - Task"],
            description: "Delete a task",
            params: { type: "object", properties: { id: { type: "string" } } },
        },
    }, task_controller_1.adminTaskController.delete);
}
exports.default = adminTaskRoutes;
