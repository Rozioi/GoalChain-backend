import { Telegraf } from "telegraf";
import { env } from "../config/env";

export const startBot = () => {
  if (!env.BOT_TOKEN) {
    console.warn("BOT_TOKEN is not provided. Telegram bot will not start.");
    return;
  }

  const bot = new Telegraf(env.BOT_TOKEN);

  bot.start((ctx) => {
    ctx.reply(
      "Welcome to Football Manager! Manage your team, rent players, and climb the leaderboards.",
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Open Web App",
                web_app: {
                  url: "https://soundly-primary-protozoa.cloudpub.ru/",
                },
              },
            ],
          ],
        },
      },
    );
  });

  bot
    .launch()
    .then(() => console.log("Telegram bot launched successfully."))
    .catch((err: Error) =>
      console.error("Failed to launch Telegram bot:", err),
    );

  // Enable graceful stop
  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
};
