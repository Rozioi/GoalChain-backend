"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminTaskController = exports.taskController = void 0;
const taskService = __importStar(require("./task.service"));
exports.taskController = {
    list: async (request, reply) => {
        const userId = request.user.userId;
        const tasks = await taskService.getTasksForUser(request.server, userId);
        return reply.send(tasks);
    },
    claim: async (request, reply) => {
        const userId = request.user.userId;
        const { taskId } = request.body;
        const result = await taskService.claimTask(request.server, userId, taskId);
        return reply.send(result);
    },
};
exports.adminTaskController = {
    list: async (_request, reply) => {
        const tasks = await taskService.getAllTasks(_request.server);
        return reply.send(tasks);
    },
    create: async (request, reply) => {
        const task = await taskService.createTask(request.server, {
            ...request.body,
            type: request.body.type,
            objective: request.body.objective,
        });
        return reply.status(201).send(task);
    },
    update: async (request, reply) => {
        const task = await taskService.updateTask(request.server, request.params.id, {
            ...request.body,
            type: request.body.type,
            objective: request.body.objective,
        });
        return reply.send(task);
    },
    delete: async (request, reply) => {
        await taskService.deleteTask(request.server, request.params.id);
        return reply.send({ success: true });
    },
};
