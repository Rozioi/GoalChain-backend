import { FastifyReply, FastifyRequest } from "fastify";
import {
  registerUser,
  loginUser,
  getUserProfile,
  applyReferralCode,
  getUserReferrals,
  getInviterInfoByCode,
} from "./user.service";
import { syncScoutStates } from "../scouting/scouting.service";

export const userController = {
  async login(
    req: FastifyRequest<{
      Body: {
        initData: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { initData } = req.body;
      const result = await loginUser(req.server, initData);
      reply.send(result);
    } catch (err: any) {
      reply.status(err.statusCode || 400).send({ error: err.message });
    }
  },

  async register(
    req: FastifyRequest<{
      Body: {
        initData: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const { initData } = req.body;
      const result = await registerUser(req.server, initData);
      reply.send(result);
    } catch (err: any) {
      reply.status(err.statusCode || 400).send({ error: err.message });
    }
  },

  async me(req: FastifyRequest, reply: FastifyReply) {
    try {
      await syncScoutStates(req.server, req.user.userId);

      const user = await getUserProfile(req.server, req.user.userId);
      if (!user) return reply.status(404).send({ error: "User not found" });
      reply.send(user);
    } catch (err: any) {
      reply.status(500).send({ error: err.message });
    }
  },

  async getReferralCode(req: FastifyRequest, reply: FastifyReply) {
    const user = await req.server.prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { referralCode: true },
    });
    reply.send({ referralCode: user?.referralCode });
  },

  async applyReferral(
    req: FastifyRequest<{ Body: { code: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const result = await applyReferralCode(
        req.server,
        req.user.userId,
        req.body.code,
      );
      reply.send(result);
    } catch (err: any) {
      reply.status(400).send({ error: err.message });
    }
  },

  async getReferrals(req: FastifyRequest, reply: FastifyReply) {
    try {
      const referrals = await getUserReferrals(req.server, req.user.userId);
      const mappedReferrals = referrals.map((r) => ({
        id: r.id,
        reward: r.reward,
        createdAt: r.createdAt,
        user: r.invitee,
      }));

      reply.send(mappedReferrals);
    } catch (err: any) {
      reply.status(500).send({ error: err.message });
    }
  },

  async getInviterInfo(
    req: FastifyRequest<{ Params: { code: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const inviter = await getInviterInfoByCode(req.server, req.params.code);
      reply.send(inviter);
    } catch (err: any) {
      reply.status(404).send({ error: err.message });
    }
  },
};
