"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playerController = void 0;
const football_api_service_1 = require("./football-api.service");
const player_service_1 = require("./player.service");
const nft_mint_service_1 = require("./nft-mint.service");
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
            const player = await (0, player_service_1.getPlayerImage)(req.server, id);
            reply.send(player);
        }
        catch (err) {
            req.server.log.error(err);
            reply.status(500).send({ error: err.message });
        }
    },
    async getPlayerById(req, reply) {
        try {
            const { id } = req.params;
            const image = await (0, player_service_1.getPlayerById)(req.server, id);
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
    async getNftMetadata(req, reply) {
        try {
            const metadata = await nft_mint_service_1.nftMintService.getMetadata(req.server, req.params.id);
            reply.send(metadata);
        }
        catch (err) {
            reply.status(404).send({ error: err.message });
        }
    },
    async prepareMint(req, reply) {
        try {
            const result = await nft_mint_service_1.nftMintService.prepareMint(req.server, req.user.userId, req.body.playerId, req.body.walletAddress);
            reply.send(result);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
    async confirmMint(req, reply) {
        try {
            const result = await nft_mint_service_1.nftMintService.confirmMint(req.server, req.user.userId, req.body.playerId, req.body.walletAddress, req.body.txHash);
            reply.send(result);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
};
