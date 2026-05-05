import fp from "fastify-plugin";
import caching from "@fastify/caching";

export default fp(async (app) => {
  app.register(caching, {
    privacy: "public",
    expiresIn: 30,
  });
});
