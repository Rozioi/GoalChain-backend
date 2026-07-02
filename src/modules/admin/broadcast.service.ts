import { FastifyInstance } from "fastify";
import { InputFile } from "grammy";
import { I18n } from "../../bot/i18n";

function getWebAppUrl() {
    return (
        process.env.WEBAPP_URL ||
        process.env.CORS_ORIGIN ||
        "https://soundly-primary-protozoa.cloudpub.ru/"
    );
}

function buildGameButtonMarkup(lang?: string) {
    const i18n = new I18n(lang);
    return {
        inline_keyboard: [
            [
                {
                    text: i18n.t("broadcast.play_button"),
                    web_app: { url: getWebAppUrl() },
                },
            ],
        ],
    };
}

export async function broadcastMessage(
    app: FastifyInstance,
    text: string,
    photoBase64?: string,
) {
    const { bot } = await import("../../bot/bot");
    if (!bot) {
        throw new Error("Telegram bot is not configured");
    }

    if (!text.trim()) {
        throw new Error("Message text is required");
    }

    const users = await app.prisma.user.findMany({
        where: { telegramId: { not: "" } },
        select: { id: true, telegramId: true },
    });

    const markup = buildGameButtonMarkup();
    let sent = 0;
    let failed = 0;

    for (const user of users) {
        try {
            if (photoBase64) {
                const buffer = Buffer.from(photoBase64, "base64");
                await bot.api.sendPhoto(
                    user.telegramId,
                    new InputFile(buffer, "broadcast.jpg"),
                    {
                        caption: text,
                        parse_mode: "HTML",
                        reply_markup: markup,
                    },
                );
            } else {
                await bot.api.sendMessage(user.telegramId, text, {
                    parse_mode: "HTML",
                    reply_markup: markup,
                });
            }
            sent++;
            await new Promise((r) => setTimeout(r, 50));
        } catch (err) {
            failed++;
            app.log.warn({ err, userId: user.id }, "Broadcast delivery failed");
        }
    }

    return { sent, failed, total: users.length };
}
