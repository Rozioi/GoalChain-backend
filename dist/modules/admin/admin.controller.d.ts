import { FastifyRequest, FastifyReply } from "fastify";
export declare const adminController: {
    stats: (request: FastifyRequest, reply: FastifyReply) => Promise<never>;
    listUsers: (request: FastifyRequest<{
        Querystring: {
            search?: string;
            skip?: string;
            take?: string;
        };
    }>, reply: FastifyReply) => Promise<never>;
    updateUser: (request: FastifyRequest<{
        Params: {
            id: string;
        };
        Body: {
            coins?: number;
            points?: number;
            level?: number;
            username?: string;
            isAdmin?: boolean;
        };
    }>, reply: FastifyReply) => Promise<never>;
    createSeason: (request: FastifyRequest<{
        Body: {
            name: string;
            startDate: string;
            endDate: string;
            division: number;
        };
    }>, reply: FastifyReply) => Promise<never>;
    updateSeason: (request: FastifyRequest<{
        Params: {
            id: string;
        };
        Body: {
            status: any;
        };
    }>, reply: FastifyReply) => Promise<never>;
    listSeasons: (request: FastifyRequest, reply: FastifyReply) => Promise<never>;
    endSeason: (request: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply) => Promise<never>;
    deleteUser: (request: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply) => Promise<never>;
    deleteUserTeam: (request: FastifyRequest<{
        Params: {
            id: string;
        };
    }>, reply: FastifyReply) => Promise<never>;
    broadcast: (request: FastifyRequest<{
        Body: {
            text: string;
            photoBase64?: string;
        };
    }>, reply: FastifyReply) => Promise<never>;
    listRealPlayerTemplates: (request: FastifyRequest, reply: FastifyReply) => Promise<never>;
    listReleasedRealPlayers: (request: FastifyRequest, reply: FastifyReply) => Promise<never>;
    releaseRealPlayer: (request: FastifyRequest<{
        Params: {
            templateId: string;
        };
    }>, reply: FastifyReply) => Promise<never>;
};
