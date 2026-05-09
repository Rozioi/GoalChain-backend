import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { rentService } from "../modules/player/rent.service";

async function syncPlugin(app: FastifyInstance) {
  // Run sync every minute
  setInterval(async () => {
    try {
      await rentService.syncExpiredRentals(app);
    } catch (e) {
      app.log.error(`Sync error: ${e}`);
    }
  }, 60000);
}

export default fp(syncPlugin);
