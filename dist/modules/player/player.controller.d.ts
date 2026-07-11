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
    getPlayerById(req: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    populate(req: FastifyRequest<{
        Body: {
            count?: number;
        };
    }>, reply: FastifyReply): Promise<void>;
    getNftMetadata(req: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    lockPlayer(req: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    unlockPlayer(req: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    prepareMint(req: FastifyRequest<{
        Body: {
            playerId: string;
            walletAddress: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    confirmMint(req: FastifyRequest<{
        Body: {
            playerId: string;
            walletAddress: string;
            txHash?: string;
        };
    }>, reply: FastifyReply): Promise<void>;
};
