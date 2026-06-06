"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userController = void 0;
const user_service_1 = require("./user.service");
const scouting_service_1 = require("../scouting/scouting.service");
exports.userController = {
    async register(req, reply) {
        try {
            const { telegramId, username, firstName, lastName, photoUrl } = req.body;
            const result = await (0, user_service_1.registerUser)(req.server, telegramId, username, firstName, lastName, photoUrl);
            reply.send(result);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
    async me(req, reply) {
        try {
            await (0, scouting_service_1.syncScoutStates)(req.server, req.user.userId);
            const user = await (0, user_service_1.getUserProfile)(req.server, req.user.userId);
            if (!user)
                return reply.status(404).send({ error: "User not found" });
            reply.send(user);
        }
        catch (err) {
            reply.status(500).send({ error: err.message });
        }
    },
    async getReferralCode(req, reply) {
        const user = await req.server.prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { referralCode: true },
        });
        reply.send({ referralCode: user?.referralCode });
    },
    async applyReferral(req, reply) {
        try {
            const result = await (0, user_service_1.applyReferralCode)(req.server, req.user.userId, req.body.code);
            reply.send(result);
        }
        catch (err) {
            reply.status(400).send({ error: err.message });
        }
    },
    async getReferrals(req, reply) {
        try {
            const referrals = await (0, user_service_1.getUserReferrals)(req.server, req.user.userId);
            const mappedReferrals = referrals.map((r) => ({
                id: r.id,
                reward: r.reward,
                createdAt: r.createdAt,
                user: r.invitee,
            }));
            reply.send(mappedReferrals);
        }
        catch (err) {
            reply.status(500).send({ error: err.message });
        }
    },
    async getInviterInfo(req, reply) {
        try {
            const inviter = await (0, user_service_1.getInviterInfoByCode)(req.server, req.params.code);
            reply.send(inviter);
        }
        catch (err) {
            reply.status(404).send({ error: err.message });
        }
    },
};
