import { FastifyReply, FastifyRequest } from "fastify";
import {
    getMyTeam,
    updateLineup,
    substitutePlayer,
    getTeamRating,
} from "./team.service";

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
            Body: {
                starters?: { playerId: string; slotKey: string }[];
                starterIds?: string[];
                formation?: string;
            };
        }>,
        reply: FastifyReply,
    ) {
        try {
            const formation = req.body.formation || "4-4-2";

            let starters: { playerId: string; slotKey: string }[];

            if (req.body.starters) {
                starters = req.body.starters;
            } else if (req.body.starterIds) {
                // Преобразуем starterIds в формат с slotKey через порядок слотов 4-4-2
                const slotOrder = [
                    "st1", "st2", "lm", "cm1", "cm2", "rm",
                    "lb", "cb1", "cb2", "rb", "gk",
                ];
                starters = req.body.starterIds.map((playerId, i) => ({
                    playerId,
                    slotKey: slotOrder[i] || `slot-${i}`,
                }));
            } else {
                throw new Error("Missing 'starters' or 'starterIds'");
            }

            const result = await updateLineup(
                req.server,
                req.user.userId,
                starters,
                formation,
            );
            reply.send(result);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },

    async substitute(
        req: FastifyRequest<{
            Body: { outPlayerId: string; inPlayerId: string; slotKey: string };
        }>,
        reply: FastifyReply,
    ) {
        try {
            const result = await substitutePlayer(
                req.server,
                req.user.userId,
                req.body.outPlayerId,
                req.body.inPlayerId,
                req.body.slotKey,
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
