import { FastifyReply, FastifyRequest } from "fastify";
export declare const trainingController: {
    start(req: FastifyRequest<{
        Body: {
            playerId: string;
            complexId: string;
        };
    }>, reply: FastifyReply): Promise<undefined>;
    cost(req: FastifyRequest<{
        Params: {
            playerId: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    complexes(req: FastifyRequest<{
        Params: {
            playerId: string;
        };
    }>, reply: FastifyReply): Promise<void>;
};
