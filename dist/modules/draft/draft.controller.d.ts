import { FastifyReply, FastifyRequest } from "fastify";
export declare const draftController: {
    start(req: FastifyRequest, reply: FastifyReply): Promise<void>;
    getOptions(req: FastifyRequest<{
        Params: {
            step: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    pick(req: FastifyRequest<{
        Body: {
            optionIds: string[];
        };
    }>, reply: FastifyReply): Promise<void>;
    complete(req: FastifyRequest<{
        Body: {
            clubName?: string;
        };
    }>, reply: FastifyReply): Promise<void>;
};
