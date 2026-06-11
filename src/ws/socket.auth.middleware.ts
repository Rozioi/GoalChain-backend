import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { JwtSocketPayload } from "./types";

export interface AuthenticatedSocket extends Socket {
  data: {
    user: JwtSocketPayload;
  };
}

export function authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void) {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtSocketPayload;
    if (!payload.userId) {
      return next(new Error("Invalid token payload"));
    }
    socket.data.user = payload;
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
}
