import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

export default fp(async (app) => {
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Football Manager API",
        description: "Документация API для футбольного симулятора",
        version: "1.0.0",
      },
    },
  });

  await app.register(swaggerUI, {
    routePrefix: "/docs",
  });
});
