import { FastifyInstance } from "fastify";
import matchController from "./match.controller";

async function matchRoutes(app: FastifyInstance) {
  app.addHook("preHandler", app.authenticate);

  app.post(
    "/match/friendly",
    {
      schema: {
        tags: ["Match"],
        summary: "Сыграть товарищеский матч",
        description: "Начинает матч против случайного противника или бота, если никто не найден.",
      },
    },
    matchController.friendly,
  );

  app.post(
    "/match/bot",
    {
      schema: {
        tags: ["Match"],
        summary: "Сыграть с ботом",
        description: "Мгновенно начинает матч против бота.",
      },
    },
    matchController.bot,
  );

  app.post(
    "/match/invite/:friendId",
    {
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
    },
    matchController.invite,
  );

  app.post(
    "/match/accept/:matchId",
    {
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
    },
    matchController.accept,
  );

  app.post(
    "/match/:matchId/tactics",
    {
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
    },
    matchController.updateTactics,
  );

  app.get(
    "/match/history",
    {
      schema: {
        tags: ["Match"],
        summary: "Получить историю матчей",
      },
    },
    matchController.history,
  );
}

export default matchRoutes;
