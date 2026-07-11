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
    decline(req: FastifyRequest<{
        Params: {
            inviteId: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    cancelInvite(req: FastifyRequest<{
        Params: {
            inviteId: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    pendingInvites(req: FastifyRequest, reply: FastifyReply): Promise<void>;
    history(req: FastifyRequest, reply: FastifyReply): Promise<void>;
    updateTactics(req: FastifyRequest<{
        Params: {
            matchId: string;
        };
        Body: {
            pressingType?: "SOFT" | "MEDIUM" | "INTENSIVE";
            substitutions?: {
                outId: string;
                inId: string;
            }[];
        };
    }>, reply: FastifyReply): Promise<void>;
    get(req: FastifyRequest<{
        Params: {
            matchId: string;
        };
    }>, reply: FastifyReply): Promise<undefined>;
    cancel(req: FastifyRequest, reply: FastifyReply): Promise<void>;
    streak(req: FastifyRequest<{
        Params: {
            userId: string;
        };
    }>, reply: FastifyReply): Promise<void>;
};
export default matchController;
