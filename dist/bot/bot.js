"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startBot = void 0;
const telegraf_1 = require("telegraf");
const env_1 = require("../config/env");
const startBot = () => {
    if (!env_1.env.BOT_TOKEN) {
        console.warn("BOT_TOKEN is not provided. Telegram bot will not start.");
        return;
    }
    const bot = new telegraf_1.Telegraf(env_1.env.BOT_TOKEN);
    bot.start((ctx) => {
        ctx.reply("Welcome to Football Manager! Manage your team, rent players, and climb the leaderboards.", {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "Open Web App",
                            web_app: { url: "https://your-mini-app-url.vercel.app/" }, // Replace with actual URL
                        },
                    ],
                ],
            },
        });
    });
    bot.launch()
        .then(() => console.log("Telegram bot launched successfully."))
        .catch((err) => console.error("Failed to launch Telegram bot:", err));
    // Enable graceful stop
    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));
};
exports.startBot = startBot;
