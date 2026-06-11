import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";
import { rentService } from "../modules/player/rent.service";
import { cleanupBotData } from "../modules/match/match.cleanup";
import { expireStaleInvites } from "../modules/match/match-invite.service";
import { expireStaleMatchmaking } from "../modules/match/matchmaking.service";
import { INVITE } from "../config/constants";

async function syncPlugin(app: FastifyInstance) {
  setInterval(async () => {
    try {
      await rentService.syncExpiredRentals(app);
    } catch (e) {
      app.log.error(`Sync error: ${e}`);
    }
  }, 60000);

  setInterval(async () => {
    try {
      await cleanupBotData(app);
    } catch (e) {
      app.log.error(`Cleanup error: ${e}`);
    }
  }, 3600000);

  setInterval(async () => {
    try {
      const expiredInvites = await expireStaleInvites(app);
      const expiredQueues = await expireStaleMatchmaking(app);
      if (expiredInvites > 0 || expiredQueues > 0) {
        app.log.info({ expiredInvites, expiredQueues }, "Expired stale match entries");
      }
    } catch (e) {
      app.log.error(`Invite/matchmaking expiry error: ${e}`);
    }
  }, INVITE.EXPIRY_CHECK_INTERVAL_MS);
}

export default fp(syncPlugin);
