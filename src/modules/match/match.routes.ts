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
    "/match/invite",
    {
      schema: {
        tags: ["Match"],
        summary: "Создать открытое приглашение на матч",
        description: "Генерирует ссылку, по которой любой пользователь может присоединиться к матчу.",
      },
    },
    matchController.createInvite,
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
        description: "Принимает MatchInvite по inviteId (legacy: matchId). Создаёт Match в статусе READY.",
        params: {
          type: "object",
          required: ["matchId"],
          properties: {
            matchId: { type: "string", description: "inviteId или legacy matchId" },
          },
        },
      },
    },
    matchController.accept,
  );

  app.post(
    "/match/invite/:inviteId/decline",
    {
      schema: {
        tags: ["Match"],
        summary: "Отклонить приглашение",
        params: {
          type: "object",
          required: ["inviteId"],
          properties: { inviteId: { type: "string" } },
        },
      },
    },
    matchController.decline,
  );

  app.post(
    "/match/invite/:inviteId/cancel",
    {
      schema: {
        tags: ["Match"],
        summary: "Отменить отправленное приглашение",
        params: {
          type: "object",
          required: ["inviteId"],
          properties: { inviteId: { type: "string" } },
        },
      },
    },
    matchController.cancelInvite,
  );

  app.get(
    "/match/invites/pending",
    {
      schema: {
        tags: ["Match"],
        summary: "Список активных приглашений",
      },
    },
    matchController.pendingInvites,
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
            substitutions: {
              type: "array",
              description: "Список ручных замен",
              items: {
                type: "object",
                properties: {
                  outId: { type: "string", description: "ID игрока, покидающего поле" },
                  inId: { type: "string", description: "ID игрока, выходящего на поле" },
                },
                required: ["outId", "inId"],
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
  
  app.get(
    "/match/:matchId",
    {
      schema: {
        tags: ["Match"],
        summary: "Получить статус матча по ID",
        params: {
          type: "object",
          required: ["matchId"],
          properties: {
            matchId: { type: "string" },
          },
        },
      },
    },
    matchController.get,
  );

  app.post(
    "/match/cancel",
    {
      schema: {
        tags: ["Match"],
        summary: "Отменить поиск матча",
      },
    },
    matchController.cancel,
  );
}

export default matchRoutes;
