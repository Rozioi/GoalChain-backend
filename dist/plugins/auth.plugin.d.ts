declare module "fastify" {
    interface FastifyInstance {
        authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}
declare module "@fastify/jwt" {
    interface FastifyJWT {
        payload: {
            userId: string;
            telegramId: string;
        };
        user: {
            userId: string;
            telegramId: string;
        };
    }
}
declare const _default: (app: import("fastify").FastifyInstance<import("fastify").RawServerDefault, import("node:http").IncomingMessage, import("node:http").ServerResponse<import("node:http").IncomingMessage>, import("fastify").FastifyBaseLogger, import("fastify").FastifyTypeProviderDefault>) => Promise<void>;
export default _default;
