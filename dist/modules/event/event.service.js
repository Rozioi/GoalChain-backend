"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActiveEvents = getActiveEvents;
exports.startEventDraft = startEventDraft;
exports.createEvent = createEvent;
exports.getEventStandings = getEventStandings;
async function getActiveEvents(app) {
    return app.prisma.event.findMany({
        where: { status: { in: ["UPCOMING", "DRAFT_PHASE", "ACTIVE"] } },
        orderBy: { startDate: "asc" },
    });
}
async function startEventDraft(app, userId, eventId) {
    const event = await app.prisma.event.findUnique({
        where: { id: eventId },
    });
    if (!event)
        throw new Error("Event not found");
    if (event.status !== "DRAFT_PHASE") {
        throw new Error("Event is not in draft phase");
    }
    const existing = await app.prisma.eventDraft.findFirst({
        where: { eventId, userId },
    });
    if (existing)
        throw new Error("Already drafted for this event");
    const draft = await app.prisma.eventDraft.create({
        data: {
            eventId,
            userId,
            step: "GK",
        },
    });
    return draft;
}
async function createEvent(app, name, type, startDate, endDate, rules) {
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
async function getEventStandings(app, eventId) {
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
