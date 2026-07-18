"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seasonController = void 0;
const season_service_1 = require("./season.service");
exports.seasonController = {
    async current(req, reply) {
        try {
            const season = await (0, season_service_1.getCurrentSeason)(req.server);
            reply.header("Cache-Control", "public, max-age=30");
            reply.send(season || { message: "No active season" });
        }
        catch (err) {
            reply.status(500).send({ error: err.message });
        }
    },
    async standings(req, reply) {
        try {
            const standings = await (0, season_service_1.getSeasonStandings)(req.server, req.params.seasonId, req.user.userId, req.query.filter);
            reply.send(standings);
        }
        catch (err) {
            reply.status(500).send({ error: err.message });
        }
    },
    async register(req, reply) {
        try {
            const result = await (0, season_service_1.registerForSeason)(req.server, req.user.userId);
            reply.send(result);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
};
