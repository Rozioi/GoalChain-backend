import { FastifyReply, FastifyRequest } from "fastify";
import { startTraining, getTrainingCost } from "./training.service";

export const trainingController = {
    async start(
        req: FastifyRequest<{
            Body: { playerId: string; stat: string };
        }>,
        reply: FastifyReply,
    ) {
        try {
            const result = await startTraining(
                req.server,
                req.user.userId,
                req.body.playerId,
                req.body.stat,
            );
            reply.send(result);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },

    async cost(
        req: FastifyRequest<{ Params: { playerId: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const result = await getTrainingCost(
                req.server,
                req.user.userId,
                req.params.playerId,
            );
            reply.send(result);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },
};
