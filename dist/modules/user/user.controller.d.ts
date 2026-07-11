import { FastifyReply, FastifyRequest } from "fastify";
import { ClubInfo } from "./user.service";
export declare const userController: {
    login(req: FastifyRequest<{
        Body: {
            initData: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    deleteUser(req: FastifyRequest, reply: FastifyReply): Promise<never>;
    register(req: FastifyRequest<{
        Body: {
            initData: string;
            clubInfo: ClubInfo;
        };
    }>, reply: FastifyReply): Promise<void>;
    syncTelegram(req: FastifyRequest<{
        Body: {
            initData: string;
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
    getGlobalRank(req: FastifyRequest, reply: FastifyReply): Promise<void>;
    getLeaderboard(req: FastifyRequest, reply: FastifyReply): Promise<void>;
};
