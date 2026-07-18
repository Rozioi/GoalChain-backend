"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teamController = void 0;
const team_service_1 = require("./team.service");
exports.teamController = {
    async myTeam(req, reply) {
        try {
            const team = await (0, team_service_1.getMyTeam)(req.server, req.user.userId);
            reply.send(team);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
    async setLineup(req, reply) {
        try {
            const result = await (0, team_service_1.updateLineup)(req.server, req.user.userId, req.body.starters, req.body.formation);
            reply.send(result);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
    async substitute(req, reply) {
        try {
            const result = await (0, team_service_1.substitutePlayer)(req.server, req.user.userId, req.body.outPlayerId, req.body.inPlayerId, req.body.slotKey);
            reply.send(result);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
    async rating(req, reply) {
        try {
            const result = await (0, team_service_1.getTeamRating)(req.server, req.user.userId);
            reply.send(result);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
};
