import { FastifyReply, FastifyRequest } from "fastify";
import { playBotMatch, getMatchHistory, getMatchById } from "./match.service";
import { startMatchmaking, cancelMatchmaking } from "./matchmaking.service";
import {
    inviteFriend,
    createOpenChallenge,
    acceptInvite,
    declineInvite,
    cancelInvite,
    getPendingInvites,
} from "./match-invite.service";

const matchController = {
    async friendly(req: FastifyRequest, reply: FastifyReply) {
        try {
            const result = await startMatchmaking(req.server, req.user.userId);
            reply.send(result);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },

    async bot(req: FastifyRequest, reply: FastifyReply) {
        try {
            const result = await playBotMatch(req.server, req.user.userId);
            reply.send(result);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },

    async invite(
        req: FastifyRequest<{ Params: { friendId: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const result = await inviteFriend(
                req.server,
                req.user.userId,
                req.params.friendId,
            );
            reply.send(result);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },

    async createInvite(req: FastifyRequest, reply: FastifyReply) {
        try {
            const result = await createOpenChallenge(
                req.server,
                req.user.userId,
            );
            reply.send(result);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },

    async accept(
        req: FastifyRequest<{ Params: { matchId: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const result = await acceptInvite(
                req.server,
                req.user.userId,
                req.params.matchId,
            );
            reply.send(result);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },

    async decline(
        req: FastifyRequest<{ Params: { inviteId: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const result = await declineInvite(
                req.server,
                req.user.userId,
                req.params.inviteId,
            );
            reply.send(result);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },

    async cancelInvite(
        req: FastifyRequest<{ Params: { inviteId: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const result = await cancelInvite(
                req.server,
                req.user.userId,
                req.params.inviteId,
            );
            reply.send(result);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },

    async pendingInvites(req: FastifyRequest, reply: FastifyReply) {
        try {
            const invites = await getPendingInvites(
                req.server,
                req.user.userId,
            );
            reply.send(invites);
        } catch (err: any) {
            reply.status(500).send({ error: err.message });
        }
    },

    async history(req: FastifyRequest, reply: FastifyReply) {
        try {
            const matches = await getMatchHistory(req.server, req.user.userId);
            reply.send(matches);
        } catch (err: any) {
            reply.status(500).send({ error: err.message });
        }
    },

    async updateTactics(
        req: FastifyRequest<{
            Params: { matchId: string };
            Body: {
                pressingType?: "SOFT" | "MEDIUM" | "INTENSIVE";
                substitutions?: { outId: string; inId: string }[];
            };
        }>,
        reply: FastifyReply,
    ) {
        try {
            const { updateLiveTactics } = await import("./match-live.service");
            const result = await updateLiveTactics(
                req.server,
                req.params.matchId,
                req.user.userId,
                req.body,
            );
            reply.send(result);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },

    async get(
        req: FastifyRequest<{ Params: { matchId: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const matchData = await getMatchById(
                req.server,
                req.params.matchId,
            );
            if (!matchData) {
                return reply.status(404).send({ error: "Match not found" });
            }
            reply.send(matchData);
        } catch (err: any) {
            reply.status(500).send({ error: err.message });
        }
    },

    async cancel(req: FastifyRequest, reply: FastifyReply) {
        try {
            const result = await cancelMatchmaking(req.server, req.user.userId);
            reply.send(result);
        } catch (err: any) {
            reply.status(500).send({ error: err.message });
        }
    },

    async streak(
        req: FastifyRequest<{ Params: { userId: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const { getMatchStreak } = await import("./match.service");
            const result = await getMatchStreak(req.server, req.params.userId);
            reply.send(result);
        } catch (err: any) {
            reply.status(404).send({ error: err.message });
        }
    },
};

export default matchController;
