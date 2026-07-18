import { FastifyInstance } from "fastify";
import { Player, PlayerRole } from "@prisma/client";
export declare function getAvailableRealPlayers(app: FastifyInstance, role?: PlayerRole): Promise<Player[]>;
export declare function tryAcquireRealPlayerFromPool(app: FastifyInstance, userId: string, role?: PlayerRole): Promise<Player | null>;
