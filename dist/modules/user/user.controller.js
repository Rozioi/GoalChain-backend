"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userController = void 0;
const user_service_1 = require("./user.service");
const scouting_service_1 = require("../scouting/scouting.service");
exports.userController = {
    async login(req, reply) {
        try {
            const { initData } = req.body;
            const result = await (0, user_service_1.loginUser)(req.server, initData);
            reply.send(result);
        }
        catch (err) {
            reply.status(err.statusCode || 400).send({ error: err.message });
        }
    },
    async deleteUser(req, reply) {
        try {
            const { id } = req.params;
            const prisma = req.server.prisma;
            console.log(id);
            const user = await prisma.user.findUnique({ where: { telegramId: id } });
            console.log(user);
            if (!user) {
                return reply.status(404).send({ message: "Пользователь не найден" });
            }
            await prisma.user.delete({ where: { telegramId: id } });
            return reply.send({
                success: true,
                message: "Пользователь и его команда полностью вычищены из базы",
            });
        }
        catch (error) {
            req.log.error(error);
            return reply
                .status(500)
                .send({ message: "Ошибка при удалении пользователя" });
        }
    },
    async register(req, reply) {
        try {
            const { initData, clubInfo } = req.body;
            const result = await (0, user_service_1.registerUser)(req.server, initData, clubInfo);
            reply.send(result);
        }
        catch (err) {
            reply.status(err.statusCode || 400).send({ error: err.message });
        }
    },
    async syncTelegram(req, reply) {
        try {
            const { initData } = req.body;
            const user = await (0, user_service_1.syncTelegramProfile)(req.server, req.user.userId, initData);
            reply.send(user);
        }
        catch (err) {
            reply.status(err.statusCode || 400).send({ error: err.message });
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
    async getGlobalRank(req, reply) {
        try {
            const rank = await (0, user_service_1.getUserGlobalRank)(req.server, req.user.userId);
            reply.send({ rank });
        }
        catch (err) {
            reply.status(500).send({ error: err.message });
        }
    },
    async getLeaderboard(req, reply) {
        try {
            const leaderboard = await (0, user_service_1.getLeaderboard)(req.server, 10);
            reply.send(leaderboard);
        }
        catch (err) {
            reply.status(500).send({ error: err.message });
        }
    },
};
