import { FastifyInstance } from "fastify";
import { EventType } from "@prisma/client";
export declare function getActiveEvents(app: FastifyInstance): Promise<{
    id: string;
    name: string;
    createdAt: Date;
    type: import(".prisma/client").$Enums.EventType;
    status: import(".prisma/client").$Enums.EventStatus;
    startDate: Date;
    endDate: Date;
    rules: import("@prisma/client/runtime/library").JsonValue | null;
}[]>;
export declare function startEventDraft(app: FastifyInstance, userId: string, eventId: string): Promise<{
    id: string;
    teamId: string | null;
    userId: string;
    eventId: string;
    createdAt: Date;
    updatedAt: Date;
    status: import(".prisma/client").$Enums.DraftStatus;
    step: import(".prisma/client").$Enums.DraftStep;
}>;
export declare function createEvent(app: FastifyInstance, name: string, type: EventType, startDate: Date, endDate: Date, rules?: any): Promise<{
    id: string;
    name: string;
    createdAt: Date;
    type: import(".prisma/client").$Enums.EventType;
    status: import(".prisma/client").$Enums.EventStatus;
    startDate: Date;
    endDate: Date;
    rules: import("@prisma/client/runtime/library").JsonValue | null;
}>;
export declare function getEventStandings(app: FastifyInstance, eventId: string): Promise<{
    teams: {
        id: string;
        name: string;
        rating: number;
        formation: string;
        userId: string;
        isEvent: boolean;
        eventId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[];
    matches: {
        id: string;
        eventId: string | null;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.MatchType;
        status: import(".prisma/client").$Enums.MatchStatus;
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
