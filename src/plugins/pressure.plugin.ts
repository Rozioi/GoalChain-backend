import fp from "fastify-plugin";
import pressure from "@fastify/under-pressure";

export default fp(async (app) => {
  app.register(pressure, {
    maxEventLoopDelay: 5000,
    exposeStatusRoute: {
      routeOpts: { logLevel: "silent" },
      routeSchemaOpts: {},
      url: "/api/v1/health",
    },
  });
});
