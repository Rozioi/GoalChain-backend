/**
 * Client WebSocket integration example (Telegram Mini App / React)
 *
 * npm install socket.io-client
 */
import { Socket } from "socket.io-client";
export declare function connectMatchSocket(jwtToken: string, apiUrl: string): Socket;
