import { FastifyInstance } from "fastify";
import { EventType, DraftStep } from "@prisma/client";

export async function getActiveEvents(app: FastifyInstance) {
  return app.prisma.event.findMany({
    where: { status: { in: ["UPCOMING", "DRAFT_PHASE", "ACTIVE"] } },
    orderBy: { startDate: "asc" },
  });
}

export async function startEventDraft(
  app: FastifyInstance,
  userId: string,
  eventId: string,
) {
  const event = await app.prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) throw new Error("Event not found");
  if (event.status !== "DRAFT_PHASE") {
    throw new Error("Event is not in draft phase");
  }

  const existing = await app.prisma.eventDraft.findFirst({
    where: { eventId, userId },
  });
  if (existing) throw new Error("Already drafted for this event");

  const draft = await app.prisma.eventDraft.create({
    data: {
      eventId,
      userId,
      step: "GK" as DraftStep,
    },
  });

  return draft;
}

export async function createEvent(
  app: FastifyInstance,
  name: string,
  type: EventType,
  startDate: Date,
  endDate: Date,
  rules?: any,
) {
  return app.prisma.event.create({
    data: {
      name,
      type,
      status: "UPCOMING",
      startDate,
      endDate,
      rules: rules || null,
    },
  });
}

export async function getEventStandings(app: FastifyInstance, eventId: string) {
  const teams = await app.prisma.team.findMany({
    where: { eventId, isEvent: true },
    orderBy: { rating: "desc" },
  });

  const matches = await app.prisma.match.findMany({
    where: { eventId },
    orderBy: { createdAt: "desc" },
  });

  return { teams, matches };
}
