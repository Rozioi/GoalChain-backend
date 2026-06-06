import { FastifyInstance } from "fastify";
declare function getPlayerImage(app: FastifyInstance, playerId: string): Promise<string | null>;
export { getPlayerImage };
