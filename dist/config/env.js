"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
exports.env = {
    DATABASE_URL: process.env.DATABASE_URL || "",
    JWT_SECRET: process.env.JWT_SECRET || "super-secret-dev-key-change-me",
    BOT_TOKEN: process.env.BOT_TOKEN || "",
    PORT: parseInt(process.env.PORT || "3000", 10),
    NODE_ENV: process.env.NODE_ENV || "development",
    REDIS_URL: process.env.REDIS_URL || "",
    CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
    TON_COLLECTION_ADDRESS: process.env.TON_COLLECTION_ADDRESS || "",
    TON_RPC_ENDPOINT: process.env.TON_RPC_ENDPOINT || "https://toncenter.com/api/v2/jsonRPC",
    WEBAPP_URL: process.env.WEBAPP_URL || "",
};
