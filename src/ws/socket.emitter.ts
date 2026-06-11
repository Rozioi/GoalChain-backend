import { Server } from "socket.io";
import { ServerEvent } from "./types";

let ioInstance: Server | null = null;

export function setSocketServer(io: Server) {
  ioInstance = io;
}

export function getSocketServer(): Server {
  if (!ioInstance) throw new Error("Socket.IO not initialized");
  return ioInstance;
}

export function userRoom(userId: string) {
  return `user:${userId}`;
}

export function matchRoom(matchId: string) {
  return `match:${matchId}`;
}

export function emitToUser(userId: string, event: ServerEvent, payload: unknown) {
  if (!ioInstance) return;
  ioInstance.to(userRoom(userId)).emit(event, payload);
}

export function emitToMatch(matchId: string, event: ServerEvent, payload: unknown) {
  if (!ioInstance) return;
  ioInstance.to(matchRoom(matchId)).emit(event, payload);
}

export function emitToUsers(userIds: string[], event: ServerEvent, payload: unknown) {
  if (!ioInstance) return;
  for (const userId of userIds) {
    ioInstance.to(userRoom(userId)).emit(event, payload);
  }
}
