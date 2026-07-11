import { FastifyReply, FastifyRequest } from "fastify";
export declare const scoutingController: {
    hire(req: FastifyRequest<{
        Body: {
            region: string;
            tier: "BASE" | "COMMON" | "PRO" | "MASTER";
            targetRole?: string;
            ageMin?: number;
            ageMax?: number;
        };
    }>, reply: FastifyReply): Promise<undefined>;
    masterPrepare(req: FastifyRequest<{
        Body: {
            region: string;
            targetRole?: string;
            ageMin?: number;
            ageMax?: number;
        };
    }>, reply: FastifyReply): Promise<void>;
    masterConfirm(req: FastifyRequest<{
        Body: {
            region: string;
            targetRole?: string;
            ageMin?: number;
            ageMax?: number;
        };
    }>, reply: FastifyReply): Promise<void>;
    results(req: FastifyRequest, reply: FastifyReply): Promise<void>;
    collect(req: FastifyRequest<{
        Params: {
            scoutId: string;
        };
    }>, reply: FastifyReply): Promise<void>;
};
