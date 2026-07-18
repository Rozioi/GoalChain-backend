import { FastifyReply, FastifyRequest } from "fastify";
export declare const teamController: {
    myTeam(req: FastifyRequest, reply: FastifyReply): Promise<void>;
    setLineup(req: FastifyRequest<{
        Body: {
            starters: {
                playerId: string;
                slotKey: string;
            }[];
            formation?: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    substitute(req: FastifyRequest<{
        Body: {
            outPlayerId: string;
            inPlayerId: string;
            slotKey: string;
        };
    }>, reply: FastifyReply): Promise<void>;
    rating(req: FastifyRequest, reply: FastifyReply): Promise<void>;
};
