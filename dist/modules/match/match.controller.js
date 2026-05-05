"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const match_service_1 = require("./match.service");
const matchController = {
    async friendly(req, reply) {
        try {
            const result = await (0, match_service_1.playFriendlyMatch)(req.server, req.user.userId);
            reply.send(result);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
    async bot(req, reply) {
        try {
            const result = await (0, match_service_1.playBotMatch)(req.server, req.user.userId);
            reply.send(result);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
    async invite(req, reply) {
        try {
            const result = await (0, match_service_1.inviteFriend)(req.server, req.user.userId, req.params.friendId);
            reply.send(result);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
    async createInvite(req, reply) {
        try {
            const result = await (0, match_service_1.createOpenChallenge)(req.server, req.user.userId);
            reply.send(result);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
    async accept(req, reply) {
        try {
            const result = await (0, match_service_1.acceptMatch)(req.server, req.user.userId, req.params.matchId);
            console.log("dsadad", req.params.matchId, result);
            reply.send(result);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
    async history(req, reply) {
        try {
            const matches = await (0, match_service_1.getMatchHistory)(req.server, req.user.userId);
            reply.send(matches);
        }
        catch (err) {
            reply.status(500).send({ error: err.message });
        }
    },
    async updateTactics(req, reply) {
        try {
            const result = await (0, match_service_1.updateMatchTactics)(req.server, req.params.matchId, req.user.userId, req.body);
            reply.send(result);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
    async get(req, reply) {
        try {
            const matchData = await (0, match_service_1.getMatchById)(req.server, req.params.matchId);
            if (!matchData) {
                return reply.status(404).send({ error: "Match not found" });
            }
            reply.send(matchData);
        }
        catch (err) {
            reply.status(500).send({ error: err.message });
        }
    },
};
exports.default = matchController;
