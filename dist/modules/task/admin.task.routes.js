"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const task_controller_1 = require("./task.controller");
const admin_routes_1 = require("../admin/admin.routes");
async function adminTaskRoutes(app) {
    app.addHook("preHandler", admin_routes_1.adminGuard);
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
                    titleRu: { type: "string" },
                    descriptionRu: { type: "string" },
                    titleEn: { type: "string" },
                    descriptionEn: { type: "string" },
                    type: {
                        type: "string",
                        enum: ["SEASON", "DAILY", "INTRO"],
                    },
                    objective: {
                        type: "string",
                        enum: [
                            "GOALS",
                            "WINS",
                            "MATCHES",
                            "CLEAN_SHEETS",
                            "REFERRALS",
                        ],
                    },
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
            params: {
                type: "object",
                properties: { id: { type: "string" } },
            },
            body: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    titleRu: { type: "string" },
                    descriptionRu: { type: "string" },
                    titleEn: { type: "string" },
                    descriptionEn: { type: "string" },
                    type: {
                        type: "string",
                        enum: ["SEASON", "DAILY", "INTRO"],
                    },
                    objective: {
                        type: "string",
                        enum: [
                            "GOALS",
                            "WINS",
                            "MATCHES",
                            "CLEAN_SHEETS",
                            "REFERRALS",
                        ],
                    },
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
            params: {
                type: "object",
                properties: { id: { type: "string" } },
            },
        },
    }, task_controller_1.adminTaskController.delete);
}
exports.default = adminTaskRoutes;
