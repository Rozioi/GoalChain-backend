"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const match_controller_1 = __importDefault(require("./match.controller"));
async function matchRoutes(app) {
    app.addHook("preHandler", app.authenticate);
    app.post("/match/friendly", {
        schema: {
            tags: ["Match"],
            summary: "Сыграть товарищеский матч",
            description: "Начинает матч против случайного противника или бота, если никто не найден.",
        },
    }, match_controller_1.default.friendly);
    app.post("/match/bot", {
        schema: {
            tags: ["Match"],
            summary: "Сыграть с ботом",
            description: "Мгновенно начинает матч против бота.",
        },
    }, match_controller_1.default.bot);
    app.post("/match/invite/:friendId", {
        schema: {
            tags: ["Match"],
            summary: "Пригласить друга на матч",
            params: {
                type: "object",
                required: ["friendId"],
                properties: {
                    friendId: { type: "string" },
                },
            },
        },
    }, match_controller_1.default.invite);
    app.post("/match/accept/:matchId", {
        schema: {
            tags: ["Match"],
            summary: "Принять приглашение на матч",
            params: {
                type: "object",
                required: ["matchId"],
                properties: {
                    matchId: { type: "string" },
                },
            },
        },
    }, match_controller_1.default.accept);
    app.post("/match/:matchId/tactics", {
        schema: {
            tags: ["Match"],
            summary: "Обновить тактику (В реальном времени)",
            description: "Изменить тип прессинга или провести замену во время активного матча.",
            params: {
                type: "object",
                required: ["matchId"],
                properties: {
                    matchId: { type: "string" },
                },
            },
            body: {
                type: "object",
                properties: {
                    pressingType: {
                        type: "string",
                        enum: ["SOFT", "MEDIUM", "INTENSIVE"],
                        description: "Новый уровень прессинга команды"
                    },
                    substitution: {
                        type: "object",
                        description: "Детали ручной замены",
                        properties: {
                            outId: { type: "string", description: "ID игрока, покидающего поле" },
                            inId: { type: "string", description: "ID игрока, выходящего на поле" },
                        },
                    },
                },
            },
        },
    }, match_controller_1.default.updateTactics);
    app.get("/match/history", {
        schema: {
            tags: ["Match"],
            summary: "Получить историю матчей",
        },
    }, match_controller_1.default.history);
}
exports.default = matchRoutes;
