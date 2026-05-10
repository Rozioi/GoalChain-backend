import { FastifyInstance } from "fastify";
import { userController } from "./user.controller";

async function userRoutes(app: FastifyInstance) {
  app.post(
    "/auth/register",
    {
      schema: {
        tags: ["Auth"],
        body: {
          type: "object",
          required: ["telegramId"],
          properties: {
            telegramId: { type: "string" },
            username: { type: "string" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            photoUrl: { type: "string" },
          },
        },
      },
    },
    userController.register,
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
}

export default userRoutes;
