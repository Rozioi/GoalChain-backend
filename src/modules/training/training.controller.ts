import { FastifyReply, FastifyRequest } from "fastify";
import {
    startTraining,
    getTrainingCost,
    getRandomComplexes,
    TrainingError,
} from "./training.service";

export const trainingController = {
    async start(
        req: FastifyRequest<{
            Body: { playerId: string; complexId: string };
        }>,
        reply: FastifyReply,
    ) {
        try {
            const result = await startTraining(
                req.server,
                req.user.userId,
                req.body.playerId,
                req.body.complexId,
            );
            reply.send(result);
        } catch (err: any) {
            if (err instanceof TrainingError) {
                return reply.status(400).send({
                    error: err.message,
                    code: err.code,
                    ...(err.details || {}),
                });
            }
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

    async complexes(
        req: FastifyRequest<{ Params: { playerId: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const complexIds = await getRandomComplexes();
            reply.send({ complexes: complexIds });
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },
};
