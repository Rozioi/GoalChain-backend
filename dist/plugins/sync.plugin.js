"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const rent_service_1 = require("../modules/player/rent.service");
async function syncPlugin(app) {
    // Run sync every minute
    setInterval(async () => {
        try {
            await rent_service_1.rentService.syncExpiredRentals(app);
        }
        catch (e) {
            app.log.error(`Sync error: ${e}`);
        }
    }, 60000);
}
exports.default = (0, fastify_plugin_1.default)(syncPlugin);
