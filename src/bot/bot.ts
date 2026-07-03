import { Bot, Context } from "grammy";
import { I18n, I18nFlavor } from "@grammyjs/i18n";
import path from "path";

import { env } from "../config/env";

type MyContext = Context & I18nFlavor;
export let bot: Bot<MyContext>;

export const startBot = async () => {
    if (!env.BOT_TOKEN) {
        console.warn("BOT_TOKEN is not provided. Telegram bot will not start.");
        return;
    }
    const i18n = new I18n<MyContext>({
        defaultLocale: "en",
        // process.cwd() железно указывает на корень проекта, где лежит папка locales
        directory: path.resolve(process.cwd(), "locales"),
    });

        bot = new Bot<MyContext>(env.BOT_TOKEN);

        bot.use(i18n);

        console.log("bot initializing...");

        bot.command("start", async (ctx) => {
            await ctx.reply(
                ctx.t("welcome-message"),
                {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: ctx.t("open-web-app"),
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
