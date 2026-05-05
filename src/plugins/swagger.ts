import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

export default fp(async (app) => {
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Football Manager API",
        description:
          "Документация API для футбольного симулятора. Реализованный функционал: rent, match, draft, nft, season, scouting,training, team, admin panel",
        version: "1.0.0",
      },
    },
  });

  await app.register(swaggerUI, {
    routePrefix: "/docs",
  });
});
