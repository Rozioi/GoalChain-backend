import { FastifyReply, FastifyRequest } from "fastify";
export declare const seasonController: {
    current(req: FastifyRequest, reply: FastifyReply): Promise<void>;
    standings(req: FastifyRequest<{
        Params: {
            seasonId: string;
        };
        Querystring: {
            filter?: "GLOBAL" | "FRIENDS";
        };
    }>, reply: FastifyReply): Promise<void>;
    register(req: FastifyRequest, reply: FastifyReply): Promise<void>;
};
