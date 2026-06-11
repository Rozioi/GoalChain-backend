import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { env } from "../config/env";
import { authenticateSocket } from "../ws/socket.auth.middleware";
import { registerConnectionHandlers } from "../ws/socket.connection.handler";
import { setSocketServer } from "../ws/socket.emitter";

declare module "fastify" {
  interface FastifyInstance {
    io: Server;
  }
}

async function socketPlugin(app: FastifyInstance) {
  const io = new Server(app.server, {
    cors: {
      origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","),
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingInterval: 25_000,
    pingTimeout: 20_000,
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: false,
    },
  });

  if (env.REDIS_URL) {
    const pubClient = new Redis(env.REDIS_URL);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    app.log.info("Socket.IO Redis adapter enabled");
  } else {
    app.log.warn("REDIS_URL not set — WebSocket runs single-instance only");
  }

  io.use(authenticateSocket);
  registerConnectionHandlers(app, io);
  setSocketServer(io);

  app.decorate("io", io);

  app.addHook("onClose", async () => {
    await io.close();
  });
}

export default fp(socketPlugin, {
  name: "socket-plugin",
});
