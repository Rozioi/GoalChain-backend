import { FastifyInstance } from "fastify";
import { TaskType, TaskObjective } from "@prisma/client";
export declare function getTasksForUser(app: FastifyInstance, userId: string): Promise<{
    id: string;
    title: string;
    description: string | null;
    type: import(".prisma/client").$Enums.TaskType;
    objective: import(".prisma/client").$Enums.TaskObjective;
    reward: number;
    goal: number;
    icon: string | null;
    progress: number;
    claimed: boolean;
    claimedAt: Date | null;
}[]>;
export declare function claimTask(app: FastifyInstance, userId: string, taskId: string): Promise<{
    success: boolean;
    reward: number;
}>;
export declare function updateTaskProgress(app: FastifyInstance, userId: string, objective: TaskObjective, increment?: number): Promise<void>;
export declare function createTask(app: FastifyInstance, data: {
    title: string;
    description?: string;
    type: TaskType;
    objective?: TaskObjective;
    reward: number;
    goal: number;
    icon?: string;
}): Promise<{
    title: string;
    description: string | null;
    id: string;
    createdAt: Date;
    type: import(".prisma/client").$Enums.TaskType;
    objective: import(".prisma/client").$Enums.TaskObjective;
    reward: number;
    goal: number;
    icon: string | null;
    isActive: boolean;
}>;
export declare function updateTask(app: FastifyInstance, taskId: string, data: Partial<{
    title: string;
    description: string;
    type: TaskType;
    objective: TaskObjective;
    reward: number;
    goal: number;
    icon: string;
    isActive: boolean;
}>): Promise<{
    title: string;
    description: string | null;
    id: string;
    createdAt: Date;
    type: import(".prisma/client").$Enums.TaskType;
    objective: import(".prisma/client").$Enums.TaskObjective;
    reward: number;
    goal: number;
    icon: string | null;
    isActive: boolean;
}>;
export declare function deleteTask(app: FastifyInstance, taskId: string): Promise<{
    title: string;
    description: string | null;
    id: string;
    createdAt: Date;
    type: import(".prisma/client").$Enums.TaskType;
    objective: import(".prisma/client").$Enums.TaskObjective;
    reward: number;
    goal: number;
    icon: string | null;
    isActive: boolean;
}>;
export declare function getAllTasks(app: FastifyInstance): Promise<{
    title: string;
    description: string | null;
    id: string;
    createdAt: Date;
    type: import(".prisma/client").$Enums.TaskType;
    objective: import(".prisma/client").$Enums.TaskObjective;
    reward: number;
    goal: number;
    icon: string | null;
    isActive: boolean;
}[]>;
