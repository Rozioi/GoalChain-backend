// deep imports

import Fastify from "fastify";
import path from "path";
import fastifyStatic from "@fastify/static";

// plugin imports
import prismaPlugin from "./plugins/prisma.plugin";
import corsPlugin from "./plugins/cors.plugin";
import authPlugin from "./plugins/auth.plugin";
import swaggerPlugin from "./plugins/swagger";

// routes importa
import userRoutes from "./modules/user/user.routes";
import draftRoutes from "./modules/draft/draft.routes";
import teamRoutes from "./modules/team/team.routes";
import matchRoutes from "./modules/match/match.routes";
import trainingRoutes from "./modules/training/training.routes";
import scoutingRoutes from "./modules/scouting/scouting.routes";
import seasonRoutes from "./modules/season/season.routes";
import eventRoutes from "./modules/event/event.routes";
import taskRoutes from "./modules/task/task.routes";
import adminTaskRoutes from "./modules/task/admin.task.routes";
import adminRoutes from "./modules/admin/admin.routes";
import playerRoutes from "./modules/player/player.routes";
import pressurePlugin from "./plugins/pressure.plugin";
import cachingPlugin from "./plugins/caching.plugin";
import syncPlugin from "./plugins/sync.plugin";

// function buildApp (check documentation)

export function buildApp() {
  const app = Fastify({
    logger: true,
    pluginTimeout: 30000,
  });

  // plugin register
  app.register(corsPlugin);
  app.register(prismaPlugin);
  app.register(authPlugin);
  app.register(swaggerPlugin);
  app.register(pressurePlugin);
  app.register(cachingPlugin);
  app.register(syncPlugin);

  // route register
  app.register(userRoutes, { prefix: "/api/v1" });
  app.register(draftRoutes, { prefix: "/api/v1" });
  app.register(teamRoutes, { prefix: "/api/v1" });
  app.register(matchRoutes, { prefix: "/api/v1" });
  app.register(trainingRoutes, { prefix: "/api/v1" });
  app.register(scoutingRoutes, { prefix: "/api/v1" });
  app.register(seasonRoutes, { prefix: "/api/v1" });
  app.register(eventRoutes, { prefix: "/api/v1" });
  app.register(taskRoutes, { prefix: "/api/v1" });
  app.register(adminTaskRoutes, { prefix: "/api/v1" });
  app.register(adminRoutes, { prefix: "/api/v1" });
  app.register(playerRoutes, { prefix: "/api/v1" });
  app.register(fastifyStatic, {
    root: path.join(__dirname, "../public"), // путь к твоей папке public
    prefix: "/", // префикс, который будет в URL
  });
  // health endoint
  app.get("/api/v1/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  return app;
}
