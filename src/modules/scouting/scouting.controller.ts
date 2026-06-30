import { FastifyReply, FastifyRequest } from "fastify";
import {
    hireScount,
    getScoutResults,
    collectScoutResult,
    prepareMasterScoutPayment,
    confirmMasterScoutPayment,
} from "./scouting.service";

export const scoutingController = {
    async hire(
        req: FastifyRequest<{
            Body: {
                region: string;
                tier: "BASE" | "COMMON" | "PRO" | "MASTER";
                targetRole?: string;
                ageMin?: number;
                ageMax?: number;
            };
        }>,
        reply: FastifyReply,
    ) {
        try {
            // Map frontend tier names to backend tier names
            const tierMap: Record<string, "COMMON" | "PRO" | "MASTER"> = {
                BASE: "COMMON",
                COMMON: "COMMON",
                PRO: "PRO",
                MASTER: "MASTER",
            };
            const mappedTier = tierMap[req.body.tier] || "COMMON";

            // For MASTER tier, use prepare/confirm flow (TON payment)
            if (mappedTier === "MASTER") {
                return reply.status(400).send({
                    error: "MASTER tier requires TON payment. Use POST /scout/master/prepare",
                });
            }

            const scout = await hireScount(
                req.server,
                req.user.userId,
                req.body.region,
                mappedTier,
                req.body.targetRole as any,
                req.body.ageMin,
                req.body.ageMax,
            );
            reply.send(scout);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },

    async masterPrepare(
        req: FastifyRequest<{
            Body: {
                region: string;
                targetRole?: string;
                ageMin?: number;
                ageMax?: number;
            };
        }>,
        reply: FastifyReply,
    ) {
        try {
            const result = await prepareMasterScoutPayment(
                req.server,
                req.user.userId,
                req.body.region,
                req.body.targetRole as any,
                req.body.ageMin,
                req.body.ageMax,
            );
            reply.send(result);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },

    async masterConfirm(
        req: FastifyRequest<{
            Body: {
                region: string;
                targetRole?: string;
                ageMin?: number;
                ageMax?: number;
            };
        }>,
        reply: FastifyReply,
    ) {
        try {
            const result = await confirmMasterScoutPayment(
                req.server,
                req.user.userId,
                req.body.region,
                req.body.targetRole as any,
                req.body.ageMin,
                req.body.ageMax,
            );
            reply.send(result);
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
