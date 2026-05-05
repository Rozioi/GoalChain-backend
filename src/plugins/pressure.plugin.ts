import fp from "fastify-plugin";
import pressure from "@fastify/under-pressure";

export default fp(async (app) => {
  app.register(pressure, { maxEventLoopDelay: 1000 });
});
