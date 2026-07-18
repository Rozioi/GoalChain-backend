"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const bot_1 = require("./bot/bot");
const season_service_1 = require("./modules/season/season.service");
const start = async () => {
    const app = (0, app_1.buildApp)();
    await app.ready();
    // Season cron — проверка каждые 5 минут
    const seasonInterval = setInterval(async () => {
        try {
            await (0, season_service_1.checkAndStartUpcomingSeasons)(app);
            await (0, season_service_1.checkAndEndExpiredSeasons)(app);
        }
        catch (err) {
            app.log.error(err, "Season cron error");
        }
    }, 5 * 60 * 1000);
    // Первый запуск сразу
    try {
        await (0, season_service_1.checkAndStartUpcomingSeasons)(app);
        await (0, season_service_1.checkAndEndExpiredSeasons)(app);
    }
    catch (err) {
        app.log.error(err, "Season initial check error");
    }
    try {
        await app.listen({ port: env_1.env.PORT, host: "0.0.0.0" });
        console.log(`Server running on http://localhost:${env_1.env.PORT}`);
        console.log(`Current version api: /api/v1`);
        (0, bot_1.startBot)();
    }
    catch (err) {
        app.log.error(err);
        clearInterval(seasonInterval);
        process.exit(1);
    }
};
start();
