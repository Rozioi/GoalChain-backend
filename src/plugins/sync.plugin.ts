import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { rentService } from "../modules/player/rent.service";
import { cleanupBotData } from "../modules/match/match.cleanup";

async function syncPlugin(app: FastifyInstance) {
  // Run sync every minute
  setInterval(async () => {
    try {
      await rentService.syncExpiredRentals(app);
    } catch (e) {
      app.log.error(`Sync error: ${e}`);
    }
  }, 60000);

  // Run bot cleanup every hour
  setInterval(async () => {
    try {
      await cleanupBotData(app);
    } catch (e) {
      app.log.error(`Cleanup error: ${e}`);
    }
  }, 3600000);
}

export default fp(syncPlugin);
