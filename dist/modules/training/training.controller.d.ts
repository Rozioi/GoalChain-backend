import { FastifyReply, FastifyRequest } from "fastify";
export declare const trainingController: {
    start(req: FastifyRequest<{
        Body: {
            playerId: string;
            stat: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    cost(req: FastifyRequest<{
        Params: {
            playerId: string;
        };
    }>, reply: FastifyReply): Promise<void>;
};
