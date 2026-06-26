import { FastifyInstance } from "fastify";
import { Server } from "socket.io";
declare module "fastify" {
    interface FastifyInstance {
        io: Server;
    }
}
declare function socketPlugin(app: FastifyInstance): Promise<void>;
declare const _default: typeof socketPlugin;
export default _default;
