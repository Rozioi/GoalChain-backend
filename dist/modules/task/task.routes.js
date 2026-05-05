"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const task_controller_1 = require("./task.controller");
async function taskRoutes(app) {
    app.addHook("preHandler", app.authenticate);
    app.get("/task/list", {
        schema: {
            tags: ["Task"],
            description: "Get all active tasks with user progress",
        },
    }, task_controller_1.taskController.list);
    app.post("/task/claim", {
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
    }, task_controller_1.taskController.claim);
}
exports.default = taskRoutes;
