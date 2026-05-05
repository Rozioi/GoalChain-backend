"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoutingController = void 0;
const scouting_service_1 = require("./scouting.service");
exports.scoutingController = {
    async hire(req, reply) {
        try {
            const scout = await (0, scouting_service_1.hireScount)(req.server, req.user.userId, req.body.region, req.body.tier, req.body.targetRole, req.body.ageMin, req.body.ageMax);
            reply.send(scout);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
    async results(req, reply) {
        try {
            const results = await (0, scouting_service_1.getScoutResults)(req.server, req.user.userId);
            reply.send(results);
        }
        catch (err) {
            reply.status(500).send({ error: err.message });
        }
    },
    async collect(req, reply) {
        try {
            const result = await (0, scouting_service_1.collectScoutResult)(req.server, req.user.userId, req.params.scoutId);
            reply.send(result);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
};
