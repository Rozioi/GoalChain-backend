import { PrismaClient } from "@prisma/client";
declare module "fastify" {
    interface FastifyInstance {
        prisma: PrismaClient;
    }
}
declare const _default: (app: import("fastify").FastifyInstance<import("fastify").RawServerDefault, import("node:http").IncomingMessage, import("node:http").ServerResponse<import("node:http").IncomingMessage>, import("fastify").FastifyBaseLogger, import("fastify").FastifyTypeProviderDefault>) => Promise<void>;
export default _default;
