import "dotenv/config";

export const env = {
    DATABASE_URL: process.env.DATABASE_URL || "",
    JWT_SECRET: process.env.JWT_SECRET || "super-secret-dev-key-change-me",
    BOT_TOKEN: process.env.BOT_TOKEN || "",
    PORT: parseInt(process.env.PORT || "3000", 10),
    NODE_ENV: process.env.NODE_ENV || "development",
    REDIS_URL: process.env.REDIS_URL || "",
    CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
    TON_COLLECTION_ADDRESS: process.env.TON_COLLECTION_ADDRESS || "",
    TON_RPC_ENDPOINT:
        process.env.TON_RPC_ENDPOINT || "https://toncenter.com/api/v2/jsonRPC",
    TON_API_KEY: process.env.TON_API_KEY || "",
    TON_PAYMENT_ADDRESS: process.env.TON_PAYMENT_ADDRESS || "",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    WEBAPP_URL: process.env.WEBAPP_URL || "",
    TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME || "goalchainbot",
    TELEGRAM_APP_NAME: process.env.TELEGRAM_APP_NAME || "play",
    NETWORK: process.env.NETWORK || "mainnet",
    NFT_MINT_UNLOCKED: process.env.NFT_MINT_UNLOCKED || "",
};
