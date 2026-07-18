"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trainingController = void 0;
const training_service_1 = require("./training.service");
exports.trainingController = {
    async start(req, reply) {
        try {
            const result = await (0, training_service_1.startTraining)(req.server, req.user.userId, req.body.playerId, req.body.complexId);
            reply.send(result);
        }
        catch (err) {
            if (err instanceof training_service_1.TrainingError) {
                return reply.status(400).send({
                    error: err.message,
                    code: err.code,
                    ...(err.details || {}),
                });
            }
            reply.status(400).send({ error: err.message });
        }
    },
    async cost(req, reply) {
        try {
            const result = await (0, training_service_1.getTrainingCost)(req.server, req.user.userId, req.params.playerId);
            reply.send(result);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
    async complexes(req, reply) {
        try {
            const complexIds = await (0, training_service_1.getRandomComplexes)();
            reply.send({ complexes: complexIds });
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
};
