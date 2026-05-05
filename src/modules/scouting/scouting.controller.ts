import { FastifyReply, FastifyRequest } from "fastify";
import {
    hireScount,
    getScoutResults,
    collectScoutResult,
} from "./scouting.service";

export const scoutingController = {
    async hire(
        req: FastifyRequest<{
            Body: {
                region: string;
                tier: "COMMON" | "PRO" | "MASTER";
                targetRole?: string;
                ageMin?: number;
                ageMax?: number;
            };
        }>,
        reply: FastifyReply,
    ) {
        try {
            const scout = await hireScount(
                req.server,
                req.user.userId,
                req.body.region,
                req.body.tier,
                req.body.targetRole as any,
                req.body.ageMin,
                req.body.ageMax,
            );
            reply.send(scout);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },

    async results(req: FastifyRequest, reply: FastifyReply) {
        try {
            const results = await getScoutResults(req.server, req.user.userId);
            reply.send(results);
        } catch (err: any) {
            reply.status(500).send({ error: err.message });
        }
    },

    async collect(
        req: FastifyRequest<{ Params: { scoutId: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const result = await collectScoutResult(
                req.server,
                req.user.userId,
                req.params.scoutId,
            );
            reply.send(result);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },
};
