import { buildApp } from "./app";
import { env } from "./config/env";
import { startBot } from "./bot/bot";
import {
  checkAndStartUpcomingSeasons,
  checkAndEndExpiredSeasons,
} from "./modules/season/season.service";

const start = async () => {
  const app = buildApp();

  await app.ready();

  // Season cron — проверка каждые 5 минут
  const seasonInterval = setInterval(async () => {
    try {
      await checkAndStartUpcomingSeasons(app);
      await checkAndEndExpiredSeasons(app);
    } catch (err) {
      app.log.error(err, "Season cron error");
    }
  }, 5 * 60 * 1000);

  // Первый запуск сразу
  try {
    await checkAndStartUpcomingSeasons(app);
    await checkAndEndExpiredSeasons(app);
  } catch (err) {
    app.log.error(err, "Season initial check error");
  }

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    console.log(`Server running on http://localhost:${env.PORT}`);
    console.log(`Current version api: /api/v1`);

    startBot();
  } catch (err) {
    app.log.error(err);
    clearInterval(seasonInterval);
    process.exit(1);
  }
};

start();
