import { FastifyRequest, FastifyReply } from "fastify";
import * as adminService from "./admin.service";

export const adminController = {
    stats: async (request: FastifyRequest, reply: FastifyReply) => {
        const stats = await adminService.getGlobalStats(request.server);
        return reply.send(stats);
    },

    listUsers: async (
        request: FastifyRequest<{
            Querystring: { search?: string; skip?: string; take?: string };
        }>,
        reply: FastifyReply,
    ) => {
        const { search, skip, take } = request.query;
        const result = await adminService.listUsers(request.server, {
            search,
            skip: skip ? parseInt(skip) : undefined,
            take: take ? parseInt(take) : undefined,
        });
        return reply.send(result);
    },

    updateUser: async (
        request: FastifyRequest<{
            Params: { id: string };
            Body: {
                coins?: number;
                points?: number;
                level?: number;
                username?: string;
                isAdmin?: boolean;
            };
        }>,
        reply: FastifyReply,
    ) => {
        const user = await adminService.updateUser(
            request.server,
            request.params.id,
            request.body,
        );
        return reply.send(user);
    },

    createSeason: async (
        request: FastifyRequest<{
            Body: {
                name: string;
                startDate: string;
                endDate: string;
                division: number;
            };
        }>,
        reply: FastifyReply,
    ) => {
        const season = await adminService.createSeason(request.server, {
            ...request.body,
            startDate: new Date(request.body.startDate),
            endDate: new Date(request.body.endDate),
        });
        return reply.status(201).send(season);
    },

    updateSeason: async (
        request: FastifyRequest<{
            Params: { id: string };
            Body: { status: any };
        }>,
        reply: FastifyReply,
    ) => {
        const season = await adminService.updateSeasonStatus(
            request.server,
            request.params.id,
            request.body.status,
        );
        return reply.send(season);
    },
    listSeasons: async (request: FastifyRequest, reply: FastifyReply) => {
        const seasons = await adminService.listSeasons(request.server);
        return reply.send(seasons);
    },
    endSeason: async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) => {
        const result = await adminService.endSeason(
            request.server,
            request.params.id,
        );
        return reply.send(result);
    },

    deleteUser: async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) => {
        try {
            const result = await adminService.deleteUser(
                request.server,
                request.params.id,
            );
            return reply.send(result);
        } catch (err: any) {
            return reply.status(400).send({ error: err.message });
        }
    },

    deleteUserTeam: async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) => {
        try {
            const result = await adminService.deleteUserTeam(
                request.server,
                request.params.id,
            );
            return reply.send(result);
        } catch (err: any) {
            return reply.status(400).send({ error: err.message });
        }
    },

    broadcast: async (
        request: FastifyRequest<{
            Body: { text: string; photoBase64?: string };
        }>,
        reply: FastifyReply,
    ) => {
        try {
            const result = await adminService.broadcastMessage(
                request.server,
                request.body.text,
                request.body.photoBase64,
            );
            return reply.send(result);
        } catch (err: any) {
            return reply.status(400).send({ error: err.message });
        }
    },
};
