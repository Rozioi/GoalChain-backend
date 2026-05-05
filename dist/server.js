"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const bot_1 = require("./bot/bot");
const start = async () => {
    const app = (0, app_1.buildApp)();
    try {
        await app.listen({ port: env_1.env.PORT, host: "0.0.0.0" });
        console.log(`Server running on http://localhost:${env_1.env.PORT}`);
        console.log(`Current version api: /api/v1`);
        (0, bot_1.startBot)();
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};
start();
