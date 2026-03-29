import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";

declare module "fastify" {
    interface FastifyInstance {
        prisma: PrismaClient;
    }
}

export default fp(async (app) => {
    // Simple initialization for Prisma 6 + Local Postgres
    const prisma = new PrismaClient({
        log: ["error", "warn"],
    });

    await prisma.$connect();

    app.decorate("prisma", prisma);

    app.addHook("onClose", async () => {
        await prisma.$disconnect();
    });
});
