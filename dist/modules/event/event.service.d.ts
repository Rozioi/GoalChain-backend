import { FastifyInstance } from "fastify";
import { EventType } from "@prisma/client";
export declare function getActiveEvents(app: FastifyInstance): Promise<{
    id: string;
    createdAt: Date;
    name: string;
    status: import(".prisma/client").$Enums.EventStatus;
    type: import(".prisma/client").$Enums.EventType;
    startDate: Date;
    endDate: Date;
    rules: import("@prisma/client/runtime/library").JsonValue | null;
}[]>;
export declare function startEventDraft(app: FastifyInstance, userId: string, eventId: string): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    eventId: string;
    status: import(".prisma/client").$Enums.DraftStatus;
    step: import(".prisma/client").$Enums.DraftStep;
    teamId: string | null;
}>;
export declare function createEvent(app: FastifyInstance, name: string, type: EventType, startDate: Date, endDate: Date, rules?: any): Promise<{
    id: string;
    createdAt: Date;
    name: string;
    status: import(".prisma/client").$Enums.EventStatus;
    type: import(".prisma/client").$Enums.EventType;
    startDate: Date;
    endDate: Date;
    rules: import("@prisma/client/runtime/library").JsonValue | null;
}>;
export declare function getEventStandings(app: FastifyInstance, eventId: string): Promise<{
    teams: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        isEvent: boolean;
        rating: number;
        formation: string;
        userId: string;
        eventId: string | null;
    }[];
    matches: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        eventId: string | null;
        status: import(".prisma/client").$Enums.MatchStatus;
        seed: string | null;
        type: import(".prisma/client").$Enums.MatchType;
        homeUserId: string | null;
        awayUserId: string | null;
        homeTeamId: string;
        awayTeamId: string;
        isBot: boolean;
        homeScore: number | null;
        awayScore: number | null;
        overtime: boolean;
        homePressingType: import(".prisma/client").$Enums.PressingType;
        awayPressingType: import(".prisma/client").$Enums.PressingType;
        homeCoins: number;
        awayCoins: number;
        homeExp: number;
        awayExp: number;
        seasonId: string | null;
    }[];
}>;
