import { FastifyInstance } from "fastify";
import { userController } from "./user.controller";

async function userRoutes(app: FastifyInstance) {
  // --- AUTH RUNS ---
  app.post(
    "/auth/login",
    {
      schema: {
        tags: ["Auth"],
        body: {
          type: "object",
          required: ["initData"],
          properties: {
            initData: { type: "string" },
          },
        },
      },
    },
    userController.login,
  );

  app.post(
    "/auth/register",
    {
      schema: {
        tags: ["Auth"],
        body: {
          type: "object",
          required: ["initData", "clubInfo"],
          properties: {
            initData: { type: "string" },
            clubInfo: {
              type: "object",
              required: ["clubName"],
              properties: {
                clubName: { type: "string" },
                clubIcon: { type: "string" },
              },
            },
          },
        },
      },
    },
    userController.register,
  );

  app.delete(
    "/users/:id",
    {
      schema: {
        tags: ["Admin"],
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" },
          },
        },
      },
    },
    userController.deleteUser,
  );
  // --- USER PROFILE RUNS ---
  app.post(
    "/user/sync-telegram",
    {
      schema: {
        tags: ["User"],
        body: {
          type: "object",
          required: ["initData"],
          properties: {
            initData: { type: "string" },
          },
        },
      },
      preHandler: [app.authenticate],
    },
    userController.syncTelegram,
  );

  app.get(
    "/user/me",
    {
      schema: {
        tags: ["User"],
      },
      preHandler: [app.authenticate],
    },
    userController.me,
  );

  app.get(
    "/user/referral-code",
    {
      schema: {
        tags: ["User"],
      },
      preHandler: [app.authenticate],
    },
    userController.getReferralCode,
  );

  app.post(
    "/user/apply-referral",
    {
      schema: {
        tags: ["User"],
      },
      preHandler: [app.authenticate],
    },
    userController.applyReferral as any,
  );

  app.get(
    "/user/referrals",
    {
      schema: {
        tags: ["User"],
      },
      preHandler: [app.authenticate],
    },
    userController.getReferrals,
  );

  app.get(
    "/user/inviter/:code",
    {
      schema: {
        tags: ["User"],
        params: {
          type: "object",
          required: ["code"],
          properties: {
            code: { type: "string" },
          },
        },
      },
      preHandler: [app.authenticate],
    },
    userController.getInviterInfo as any,
  );

  app.get(
    "/user/global-rank",
    {
      schema: {
        tags: ["User"],
      },
      preHandler: [app.authenticate],
    },
    userController.getGlobalRank as any,
  );

  app.get(
    "/user/leaderboard",
    {
      schema: {
        tags: ["User"],
      },
      preHandler: [app.authenticate],
    },
    userController.getLeaderboard as any,
  );

}

export default userRoutes;
