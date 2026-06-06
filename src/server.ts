import { buildApp } from "./app";
import { env } from "./config/env";
import { startBot } from "./bot/bot";

const start = async () => {
  const app = buildApp();

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    console.log(`Server running on http://localhost:${env.PORT}`);
    console.log(`Current version api: /api/v1`);

    startBot();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
