import { FastifyReply, FastifyRequest } from "fastify";
import {
    getCurrentSeason,
    getSeasonStandings,
    registerForSeason,
    playSeasonMatch,
} from "./season.service";

export const seasonController = {
    async current(req: FastifyRequest, reply: FastifyReply) {
        try {
            const season = await getCurrentSeason(req.server);
            
            // Cache for 30 seconds
            reply.header("Cache-Control", "public, max-age=30");
            
            reply.send(season || { message: "No active season" });
        } catch (err: any) {
            reply.status(500).send({ error: err.message });
        }
    },

    async standings(
        req: FastifyRequest<{ Params: { seasonId: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const standings = await getSeasonStandings(
                req.server,
                req.params.seasonId,
            );
            reply.send(standings);
        } catch (err: any) {
            reply.status(500).send({ error: err.message });
        }
    },

    async register(req: FastifyRequest, reply: FastifyReply) {
        try {
            const result = await registerForSeason(req.server, req.user.userId);
            reply.send(result);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },

    async play(req: FastifyRequest, reply: FastifyReply) {
        try {
            const result = await playSeasonMatch(req.server, req.user.userId);
            reply.send(result);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },
};
