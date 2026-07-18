import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import { FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { userId: string; telegramId: string };
    user: { userId: string; telegramId: string };
  }
}

export default fp(async (app) => {
  app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || "super-secret-dev-key-change-me",
  });

  app.decorate(
    "authenticate",
    async function (req: FastifyRequest, reply: FastifyReply) {
      try {
        await req.jwtVerify();

        // Проверка бана
        const user = await app.prisma.user.findUnique({
          where: { id: req.user.userId },
          select: { isBanned: true },
        });
        if (user?.isBanned) {
          return reply.status(403).send({ error: "Your account has been banned" });
        }
      } catch (err) {
        reply.status(401).send({ error: "Unauthorized" });
      }
    },
  );
});
