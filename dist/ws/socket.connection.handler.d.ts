import { FastifyInstance } from "fastify";
import { Server } from "socket.io";
export declare function registerConnectionHandlers(app: FastifyInstance, io: Server): void;
export declare function isUserOnline(userId: string): boolean;
