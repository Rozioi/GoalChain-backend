import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
export declare function adminGuard(request: FastifyRequest, reply: FastifyReply): Promise<undefined>;
declare function adminRoutes(app: FastifyInstance): Promise<void>;
export default adminRoutes;
