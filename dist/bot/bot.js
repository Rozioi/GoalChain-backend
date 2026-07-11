"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startBot = exports.bot = void 0;
const grammy_1 = require("grammy");
const i18n_1 = require("@grammyjs/i18n");
const path_1 = __importDefault(require("path"));
const env_1 = require("../config/env");
const startBot = async () => {
    if (!env_1.env.BOT_TOKEN) {
        console.warn("BOT_TOKEN is not provided. Telegram bot will not start.");
        return;
    }
    const i18n = new i18n_1.I18n({
        defaultLocale: "en",
        // process.cwd() железно указывает на корень проекта, где лежит папка locales
        directory: path_1.default.resolve(process.cwd(), "locales"),
    });
    exports.bot = new grammy_1.Bot(env_1.env.BOT_TOKEN);
    exports.bot.use(i18n);
    console.log("bot initializing...");
    exports.bot.command("start", async (ctx) => {
        await ctx.reply(ctx.t("welcome-message"), {
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
