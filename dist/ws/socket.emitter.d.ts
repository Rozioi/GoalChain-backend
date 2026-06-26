import { Server } from "socket.io";
import { ServerEvent } from "./types";
export declare function setSocketServer(io: Server): void;
export declare function getSocketServer(): Server;
export declare function userRoom(userId: string): string;
export declare function matchRoom(matchId: string): string;
export declare function emitToUser(userId: string, event: ServerEvent, payload: unknown): void;
export declare function emitToMatch(matchId: string, event: ServerEvent, payload: unknown): void;
export declare function emitToUsers(userIds: string[], event: ServerEvent, payload: unknown): void;
