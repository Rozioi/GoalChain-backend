import { FastifyReply, FastifyRequest } from "fastify";
declare const matchController: {
    friendly(req: FastifyRequest, reply: FastifyReply): Promise<void>;
    bot(req: FastifyRequest, reply: FastifyReply): Promise<void>;
    invite(req: FastifyRequest<{
        Params: {
            friendId: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    createInvite(req: FastifyRequest, reply: FastifyReply): Promise<void>;
    accept(req: FastifyRequest<{
        Params: {
            matchId: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    history(req: FastifyRequest, reply: FastifyReply): Promise<void>;
    updateTactics(req: FastifyRequest<{
        Params: {
            matchId: string;
        };
        Body: {
            pressingType?: "SOFT" | "MEDIUM" | "INTENSIVE";
            substitution?: {
                outId: string;
                inId: string;
            };
        };
    }>, reply: FastifyReply): Promise<void>;
    get(req: FastifyRequest<{
        Params: {
            matchId: string;
        };
    }>, reply: FastifyReply): Promise<undefined>;
};
export default matchController;
