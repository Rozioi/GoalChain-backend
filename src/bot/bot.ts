import { Bot } from "grammy";
import { env } from "../config/env";
import { i18nFromCtx } from "./i18n";

export let bot: Bot;

function getWebAppUrl(): string {
    return (
        process.env.WEBAPP_URL ||
        process.env.CORS_ORIGIN ||
        "https://goalchain-client-production.up.railway.app/"
    );
}

export const startBot = async () => {
    if (!env.BOT_TOKEN) {
        console.warn("BOT_TOKEN is not provided. Telegram bot will not start.");
        return;
    }

    bot = new Bot(env.BOT_TOKEN);

    bot.command("start", async (ctx) => {
        const i18n = i18nFromCtx(ctx);

        await ctx.reply(i18n.t("start.welcome"), {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: i18n.t("start.open_web_app"),
                            web_app: {
                                url: getWebAppUrl(),
                            },
                        },
                    ],
                ],
            },
        });
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
