import { FastifyReply, FastifyRequest } from "fastify";
export declare const userController: {
    register(req: FastifyRequest<{
        Body: {
            telegramId: string;
            username?: string;
            firstName?: string;
            lastName?: string;
            photoUrl?: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    me(req: FastifyRequest, reply: FastifyReply): Promise<undefined>;
    getReferralCode(req: FastifyRequest, reply: FastifyReply): Promise<void>;
    applyReferral(req: FastifyRequest<{
        Body: {
            code: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    getReferrals(req: FastifyRequest, reply: FastifyReply): Promise<void>;
    getInviterInfo(req: FastifyRequest<{
        Params: {
            code: string;
        };
    }>, reply: FastifyReply): Promise<void>;
};
