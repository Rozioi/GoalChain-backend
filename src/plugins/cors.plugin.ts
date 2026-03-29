import fp from "fastify-plugin";
import cors from "@fastify/cors";

export default fp(async (app) => {
  app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-admin-token"],
    credentials: true,
  });
});
