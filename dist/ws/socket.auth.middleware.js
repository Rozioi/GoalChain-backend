"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateSocket = authenticateSocket;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
function authenticateSocket(socket, next) {
    const token = socket.handshake.auth?.token ||
        socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, "");
    if (!token) {
        return next(new Error("Authentication required"));
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        if (!payload.userId) {
            return next(new Error("Invalid token payload"));
        }
        socket.data.user = payload;
        next();
    }
    catch {
        next(new Error("Invalid or expired token"));
    }
}
