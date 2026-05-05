import { FastifyRequest, FastifyReply } from "fastify";
export declare const taskController: {
    list: (request: FastifyRequest, reply: FastifyReply) => Promise<never>;
    claim: (request: FastifyRequest<{
        Body: {
            taskId: string;
        };
    }>, reply: FastifyReply) => Promise<never>;
};
export declare const adminTaskController: {
    list: (_request: FastifyRequest, reply: FastifyReply) => Promise<never>;
    create: (request: FastifyRequest<{
        Body: {
            title: string;
            description?: string;
            type: string;
            objective?: string;
            reward: number;
            goal: number;
            icon?: string;
        };
    }>, reply: FastifyReply) => Promise<never>;
    update: (request: FastifyRequest<{
        Params: {
            id: string;
        };
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
    }>, reply: FastifyReply) => Promise<never>;
    delete: (request: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply) => Promise<never>;
};
