import { FastifyInstance } from "fastify";
export declare function broadcastMessage(app: FastifyInstance, text: string, photoBase64?: string): Promise<{
    sent: number;
    failed: number;
    total: number;
}>;
