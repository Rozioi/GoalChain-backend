"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playerController = void 0;
const football_api_service_1 = require("./football-api.service");
const player_service_1 = require("./player.service");
exports.playerController = {
    async importFromApi(req, reply) {
        try {
            const apiService = new football_api_service_1.FootballApiService(req.server);
            const { leagueId, season } = req.body;
            const result = await apiService.importPlayersForLeague(leagueId, season);
            reply.send(result);
        }
        catch (err) {
            req.server.log.error(err);
            reply.status(500).send({ error: err.message });
        }
    },
    async getPlayerImage(req, reply) {
        try {
            const { id } = req.params;
            const image = await (0, player_service_1.getPlayerImage)(req.server, id);
            reply.send(image);
        }
        catch (err) {
            req.server.log.error(err);
            reply.status(500).send({ error: err.message });
        }
    },
    async populate(req, reply) {
        try {
            const apiService = new football_api_service_1.FootballApiService(req.server);
            const result = await apiService.populateInitialDatabase(req.body.count);
            reply.send(result);
        }
        catch (err) {
            req.server.log.error(err);
            reply.status(500).send({ error: err.message });
        }
    },
};
