import { FastifyReply, FastifyRequest } from "fastify";
export declare const playerController: {
    importFromApi(req: FastifyRequest<{
        Body: {
            leagueId: number;
            season?: number;
        };
    }>, reply: FastifyReply): Promise<void>;
    getPlayerImage(req: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    populate(req: FastifyRequest<{
        Body: {
            count?: number;
        };
    }>, reply: FastifyReply): Promise<void>;
};
