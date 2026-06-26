"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastMessage = broadcastMessage;
const grammy_1 = require("grammy");
function getWebAppUrl() {
    return (process.env.WEBAPP_URL ||
        process.env.CORS_ORIGIN ||
        "https://soundly-primary-protozoa.cloudpub.ru/");
}
function buildGameButtonMarkup() {
    return {
        inline_keyboard: [
            [
                {
                    text: "🎮 Play GoalChain",
                    web_app: { url: getWebAppUrl() },
                },
            ],
        ],
    };
}
async function broadcastMessage(app, text, photoBase64) {
    const { bot } = await Promise.resolve().then(() => __importStar(require("../../bot/bot")));
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
                await bot.api.sendPhoto(user.telegramId, new grammy_1.InputFile(buffer, "broadcast.jpg"), {
                    caption: text,
                    parse_mode: "HTML",
                    reply_markup: markup,
                });
            }
            else {
                await bot.api.sendMessage(user.telegramId, text, {
                    parse_mode: "HTML",
                    reply_markup: markup,
                });
            }
            sent++;
            await new Promise((r) => setTimeout(r, 50));
        }
        catch (err) {
            failed++;
            app.log.warn({ err, userId: user.id }, "Broadcast delivery failed");
        }
    }
    return { sent, failed, total: users.length };
}
