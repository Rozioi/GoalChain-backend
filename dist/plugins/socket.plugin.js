"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const socket_io_1 = require("socket.io");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("../config/env");
const socket_auth_middleware_1 = require("../ws/socket.auth.middleware");
const socket_connection_handler_1 = require("../ws/socket.connection.handler");
const socket_emitter_1 = require("../ws/socket.emitter");
async function socketPlugin(app) {
    const io = new socket_io_1.Server(app.server, {
        cors: {
            origin: env_1.env.CORS_ORIGIN === "*" ? true : env_1.env.CORS_ORIGIN.split(","),
            credentials: true,
        },
        transports: ["websocket", "polling"],
        pingInterval: 25000,
        pingTimeout: 20000,
        connectionStateRecovery: {
            maxDisconnectionDuration: 2 * 60 * 1000,
            skipMiddlewares: false,
        },
    });
    if (env_1.env.REDIS_URL) {
        const pubClient = new ioredis_1.default(env_1.env.REDIS_URL);
        const subClient = pubClient.duplicate();
        io.adapter((0, redis_adapter_1.createAdapter)(pubClient, subClient));
        app.log.info("Socket.IO Redis adapter enabled");
    }
    else {
        app.log.warn("REDIS_URL not set — WebSocket runs single-instance only");
    }
    io.use(socket_auth_middleware_1.authenticateSocket);
    (0, socket_connection_handler_1.registerConnectionHandlers)(app, io);
    (0, socket_emitter_1.setSocketServer)(io);
    app.decorate("io", io);
    app.addHook("onClose", async () => {
        await io.close();
    });
}
exports.default = (0, fastify_plugin_1.default)(socketPlugin, {
    name: "socket-plugin",
});
