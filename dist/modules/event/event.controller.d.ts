import { FastifyReply, FastifyRequest } from "fastify";
export declare const eventController: {
    active(req: FastifyRequest, reply: FastifyReply): Promise<void>;
    startDraft(req: FastifyRequest<{
        Body: {
            eventId: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    standings(req: FastifyRequest<{
        Params: {
            eventId: string;
        };
    }>, reply: FastifyReply): Promise<void>;
};
