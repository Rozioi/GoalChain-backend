import { Socket } from "socket.io";
import { JwtSocketPayload } from "./types";
export interface AuthenticatedSocket extends Socket {
    data: {
        user: JwtSocketPayload;
    };
}
export declare function authenticateSocket(socket: AuthenticatedSocket, next: (err?: Error) => void): void;
