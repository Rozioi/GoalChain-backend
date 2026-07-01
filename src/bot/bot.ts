import { Bot } from "grammy";
import { env } from "../config/env";

export let bot: Bot;

export const startBot = async () => {
    if (!env.BOT_TOKEN) {
        console.warn("BOT_TOKEN is not provided. Telegram bot will not start.");
        return;
    }

    bot = new Bot(env.BOT_TOKEN);
    if (!bot) {
        console.warn("BOT_TOKEN is not provided. Telegram bot will not start.");
        return;
    }
    console.log("bors");

    bot.command("start", async (ctx) => {
        await ctx.reply(
            "Welcome to Football Manager! Manage your team, rent players, and climb the leaderboards.",
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "Open Web App",
                                web_app: {
                                    url: "https://goalchain-client-production.up.railway.app/",
                                },
                            },
                        ],
                    ],
                },
            },
        );
    });

    bot.catch((err) => {
        console.error("Error in bot:", err);
    });

    bot.start({
        onStart: (botInfo) => {
            console.log(
                `Telegram bot (@${botInfo.username}) launched successfully.`,
            );
        },
    });

    process.once("SIGINT", () => bot.stop());
    process.once("SIGTERM", () => bot.stop());
};
