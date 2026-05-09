import { FastifyInstance } from "fastify";
import { EventType } from "@prisma/client";
export declare function getActiveEvents(app: FastifyInstance): Promise<{
    name: string;
    id: string;
    createdAt: Date;
    startDate: Date;
    endDate: Date;
    status: import(".prisma/client").$Enums.EventStatus;
    type: import(".prisma/client").$Enums.EventType;
    rules: import("@prisma/client/runtime/library").JsonValue | null;
}[]>;
export declare function startEventDraft(app: FastifyInstance, userId: string, eventId: string): Promise<{
    id: string;
    createdAt: Date;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.DraftStatus;
    userId: string;
    eventId: string;
    teamId: string | null;
    step: import(".prisma/client").$Enums.DraftStep;
}>;
export declare function createEvent(app: FastifyInstance, name: string, type: EventType, startDate: Date, endDate: Date, rules?: any): Promise<{
    name: string;
    id: string;
    createdAt: Date;
    startDate: Date;
    endDate: Date;
    status: import(".prisma/client").$Enums.EventStatus;
    type: import(".prisma/client").$Enums.EventType;
    rules: import("@prisma/client/runtime/library").JsonValue | null;
}>;
export declare function getEventStandings(app: FastifyInstance, eventId: string): Promise<{
    teams: {
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        rating: number;
        formation: string;
        userId: string;
        isEvent: boolean;
        eventId: string | null;
    }[];
    matches: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.MatchStatus;
        eventId: string | null;
        type: import(".prisma/client").$Enums.MatchType;
        seed: string | null;
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
