import { FastifyReply, FastifyRequest } from "fastify";
import { getMyTeam, updateLineup, getTeamRating } from "./team.service";

export const teamController = {
    async myTeam(req: FastifyRequest, reply: FastifyReply) {
        try {
            const team = await getMyTeam(req.server, req.user.userId);
            reply.send(team);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },

    async setLineup(
        req: FastifyRequest<{
            Body: { starterIds: string[]; formation?: string };
        }>,
        reply: FastifyReply,
    ) {
        try {
            const result = await updateLineup(
                req.server,
                req.user.userId,
                req.body.starterIds,
                req.body.formation,
            );
            reply.send(result);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },

    async rating(req: FastifyRequest, reply: FastifyReply) {
        try {
            const result = await getTeamRating(req.server, req.user.userId);
            reply.send(result);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },
};
