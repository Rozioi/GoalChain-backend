"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startBot = exports.bot = void 0;
const grammy_1 = require("grammy");
const env_1 = require("../config/env");
const startBot = async () => {
    if (!env_1.env.BOT_TOKEN) {
        console.warn("BOT_TOKEN is not provided. Telegram bot will not start.");
        return;
    }
    exports.bot = new grammy_1.Bot(env_1.env.BOT_TOKEN);
    if (!exports.bot) {
        console.warn("BOT_TOKEN is not provided. Telegram bot will not start.");
        return;
    }
    console.log("bors");
    exports.bot.command("start", async (ctx) => {
        await ctx.reply("Welcome to Football Manager! Manage your team, rent players, and climb the leaderboards.", {
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
        });
    });
    exports.bot.catch((err) => {
        console.error("Error in bot:", err);
    });
    exports.bot.start({
        onStart: (botInfo) => {
            console.log(`Telegram bot (@${botInfo.username}) launched successfully.`);
        },
    });
    process.once("SIGINT", () => exports.bot.stop());
    process.once("SIGTERM", () => exports.bot.stop());
};
exports.startBot = startBot;
