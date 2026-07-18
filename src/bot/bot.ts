import { Bot, Context, InputFile } from "grammy";
import { I18n, I18nFlavor } from "@grammyjs/i18n";
import path from "path";
import { PrismaClient } from "@prisma/client";

import { env } from "../config/env";

type MyContext = Context & I18nFlavor;
export let bot: Bot<MyContext>;
let prisma: PrismaClient;

const WEBAPP_URL = env.WEBAPP_URL || "https://goalchain-client-production.up.railway.app/";


function getPrisma(): PrismaClient {
    if (!prisma) {
        prisma = new PrismaClient();
    }
    return prisma;
}

async function isAdmin(telegramId: string): Promise<boolean> {
    try {
        const user = await getPrisma().user.findUnique({
            where: { telegramId },
            select: { isAdmin: true },
        });
        return user?.isAdmin ?? false;
    } catch {
        return false;
    }
}

export const startBot = async () => {
    if (!env.BOT_TOKEN) {
        console.warn("BOT_TOKEN is not provided. Telegram bot will not start.");
        return;
    }
    const i18n = new I18n<MyContext>({
        defaultLocale: "en",
        directory: path.resolve(process.cwd(), "locales"),
    });

    bot = new Bot<MyContext>(env.BOT_TOKEN);
    bot.use(i18n);

    console.log("bot initializing...");

    bot.command("start", async (ctx) => {
        await ctx.reply(ctx.t("welcome-message"), {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: ctx.t("open-web-app"),
                            web_app: { url: WEBAPP_URL },
                        },
                    ],
                ],
            },
        });
    });

    // ── Команда /adminpanel ──
    bot.command("adminpanel", async (ctx) => {
        const telegramId = ctx.from?.id.toString();
        if (!telegramId || !(await isAdmin(telegramId))) {
            await ctx.reply("Я не знаю такой команды. Используйте /start .");
            return;
        }

        await ctx.reply("🔧 Admin Panel", {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "⚙️ Open Admin Panel",
                            web_app: { url: `${WEBAPP_URL}?admin=1` },
                        },
                    ],
                ],
            },
        });
    });

    // ── Вспомогательная функция: конвертирует MessageEntity[] в HTML ──
    function escapeHtml(str: string): string {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function entitiesToHtml(text: string, entities: any[]): string {
        if (!entities || entities.length === 0) return escapeHtml(text);

        // Сначала экранируем весь текст, потом восстанавливаем размеченные участки
        const sorted = [...entities].sort((a, b) => a.offset - b.offset);

        const parts: string[] = [];
        let lastEnd = 0;

        for (const entity of sorted) {
            // Текст до этой entity — экранируем
            if (entity.offset > lastEnd) {
                parts.push(escapeHtml(text.slice(lastEnd, entity.offset)));
            }

            const content = text.slice(entity.offset, entity.offset + entity.length);
            const escaped = escapeHtml(content);

            switch (entity.type) {
                case "bold":
                    parts.push(`<b>${escaped}</b>`);
                    break;
                case "italic":
                    parts.push(`<i>${escaped}</i>`);
                    break;
                case "underline":
                    parts.push(`<u>${escaped}</u>`);
                    break;
                case "strikethrough":
                    parts.push(`<s>${escaped}</s>`);
                    break;
                case "code":
                    parts.push(`<code>${escaped}</code>`);
                    break;
                case "pre":
                    parts.push(`<pre>${escaped}</pre>`);
                    break;
                case "text_link": {
                    let url = entity.url;
                    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
                        url = "https://" + url;
                    }
                    parts.push(`<a href="${escapeHtml(url)}">${escaped}</a>`);
                    break;
                }
                case "spoiler":
                    parts.push(`<tg-spoiler>${escaped}</tg-spoiler>`);
                    break;
                default:
                    parts.push(escaped);
                    break;
            }

            lastEnd = entity.offset + entity.length;
        }

        // Остаток текста после последней entity
        if (lastEnd < text.length) {
            parts.push(escapeHtml(text.slice(lastEnd)));
        }

        return parts.join("");
    }

    // ── Команда /broadcast — рассылка от админа ──
    bot.command("broadcast", async (ctx) => {
        const telegramId = ctx.from?.id.toString();
        if (!telegramId || !(await isAdmin(telegramId))) {
            await ctx.reply("⛔ Access denied. Admins only.");
            return;
        }

        let text = "";
        let entities: any[] | null = null;
        let photoBuffer: Buffer | null = null;

        // Берём текст из самого сообщения с командой (всё после /broadcast)
        const msg = ctx.msg;
        if (msg?.text) {
            // Убираем /broadcast из текста
            const broadcastCmd = msg.text.match(/^\/broadcast(@\w+)?\s*/);
            if (broadcastCmd) {
                text = msg.text.slice(broadcastCmd[0].length);
            }
            entities = (msg as any).entities || null;
        }

        // Если команда — reply на сообщение, берём текст/фото оттуда
        if (msg?.reply_to_message) {
            const reply = msg.reply_to_message;
            if (!text && (reply.text || reply.caption)) {
                text = reply.text || reply.caption || "";
                entities = (reply as any).entities || (reply as any).caption_entities || null;
            }
            if (reply.photo && reply.photo.length > 0) {
                const fileId = reply.photo[reply.photo.length - 1].file_id;
                const file = await bot.api.getFile(fileId);
                const fileUrl = `https://api.telegram.org/file/bot${env.BOT_TOKEN}/${file.file_path}`;
                const resp = await fetch(fileUrl);
                photoBuffer = Buffer.from(await resp.arrayBuffer());
            }
        }

        if (!text) {
            await ctx.reply(
                "Usage: /broadcast <message text>\n\n" +
                "Or reply to a photo with /broadcast to send it as broadcast."
            );
            return;
        }

        // Конвертируем Telegram entities в HTML
        const htmlText = entitiesToHtml(text, entities || []);

        await ctx.reply("📤 Broadcasting... Please wait.");

        try {
            const users = await getPrisma().user.findMany({
                where: { telegramId: { not: "" } },
                select: { telegramId: true },
            });

            const markup = {
                inline_keyboard: [
                    [
                        {
                            text: "🎮 Play GoalChain",
                            web_app: { url: WEBAPP_URL },
                        },
                    ],
                ],
            };

            let sent = 0;
            let failed = 0;

            for (const user of users) {
                try {
                    if (photoBuffer) {
                        await bot.api.sendPhoto(user.telegramId, new InputFile(photoBuffer, "broadcast.jpg"), {
                            caption: htmlText,
                            parse_mode: "HTML",
                            reply_markup: markup,
                        });
                    } else {
                        await bot.api.sendMessage(user.telegramId, htmlText, {
                            parse_mode: "HTML",
                            reply_markup: markup,
                        });
                    }
                    sent++;
                    await new Promise((r) => setTimeout(r, 30));
                } catch {
                    failed++;
                }
            }

            await ctx.reply(`✅ Broadcast done: ${sent} sent, ${failed} failed out of ${users.length}`);
        } catch (err: any) {
            await ctx.reply(`❌ Error: ${err.message}`);
        }
    });

    bot.catch((err) => {
        console.error("Error in bot:", err);
    });

    bot.start({
        onStart: (botInfo) => {
            console.log(`Telegram bot (@${botInfo.username}) launched successfully.`);
        },
    });

    process.once("SIGINT", () => bot.stop());
    process.once("SIGTERM", () => bot.stop());
};
