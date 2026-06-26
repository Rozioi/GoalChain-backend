"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const rent_service_1 = require("../modules/player/rent.service");
const match_cleanup_1 = require("../modules/match/match.cleanup");
const match_invite_service_1 = require("../modules/match/match-invite.service");
const matchmaking_service_1 = require("../modules/match/matchmaking.service");
const constants_1 = require("../config/constants");
async function syncPlugin(app) {
    setInterval(async () => {
        try {
            await rent_service_1.rentService.syncExpiredRentals(app);
        }
        catch (e) {
            app.log.error(`Sync error: ${e}`);
        }
    }, 60000);
    setInterval(async () => {
        try {
            await (0, match_cleanup_1.cleanupBotData)(app);
        }
        catch (e) {
            app.log.error(`Cleanup error: ${e}`);
        }
    }, 3600000);
    setInterval(async () => {
        try {
            const expiredInvites = await (0, match_invite_service_1.expireStaleInvites)(app);
            const expiredQueues = await (0, matchmaking_service_1.expireStaleMatchmaking)(app);
            if (expiredInvites > 0 || expiredQueues > 0) {
                app.log.info({ expiredInvites, expiredQueues }, "Expired stale match entries");
            }
        }
        catch (e) {
            app.log.error(`Invite/matchmaking expiry error: ${e}`);
        }
    }, constants_1.INVITE.EXPIRY_CHECK_INTERVAL_MS);
}
exports.default = (0, fastify_plugin_1.default)(syncPlugin);
