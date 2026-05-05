import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

declare module "fastify" {
    interface FastifyInstance {
        prisma: PrismaClient;
    }
}

export default fp(async (app) => {
    // Automatically push schema to the database (create tables if they don't exist)
    try {
        console.log("Pushing database schema...");
        execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });
        console.log("Database schema pushed successfully.");
    } catch (error) {
        console.error("Failed to push database schema:", error);
    }

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
