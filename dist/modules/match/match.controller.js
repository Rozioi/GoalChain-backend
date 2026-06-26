"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const match_service_1 = require("./match.service");
const matchmaking_service_1 = require("./matchmaking.service");
const match_invite_service_1 = require("./match-invite.service");
const matchController = {
    async friendly(req, reply) {
        try {
            const result = await (0, matchmaking_service_1.startMatchmaking)(req.server, req.user.userId);
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
            const result = await (0, match_invite_service_1.inviteFriend)(req.server, req.user.userId, req.params.friendId);
            reply.send(result);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
    async createInvite(req, reply) {
        try {
            const result = await (0, match_invite_service_1.createOpenChallenge)(req.server, req.user.userId);
            reply.send(result);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
    async accept(req, reply) {
        try {
            const result = await (0, match_invite_service_1.acceptInvite)(req.server, req.user.userId, req.params.matchId);
            reply.send(result);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
    async decline(req, reply) {
        try {
            const result = await (0, match_invite_service_1.declineInvite)(req.server, req.user.userId, req.params.inviteId);
            reply.send(result);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
    async cancelInvite(req, reply) {
        try {
            const result = await (0, match_invite_service_1.cancelInvite)(req.server, req.user.userId, req.params.inviteId);
            reply.send(result);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
    async pendingInvites(req, reply) {
        try {
            const invites = await (0, match_invite_service_1.getPendingInvites)(req.server, req.user.userId);
            reply.send(invites);
        }
        catch (err) {
            reply.status(500).send({ error: err.message });
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
            const { updateLiveTactics } = await Promise.resolve().then(() => __importStar(require("./match-live.service")));
            const result = await updateLiveTactics(req.server, req.params.matchId, req.user.userId, req.body);
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
    async cancel(req, reply) {
        try {
            const result = await (0, matchmaking_service_1.cancelMatchmaking)(req.server, req.user.userId);
            reply.send(result);
        }
        catch (err) {
            reply.status(500).send({ error: err.message });
        }
    },
};
exports.default = matchController;
