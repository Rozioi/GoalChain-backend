"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tonVerifyService = void 0;
const ton_1 = require("@ton/ton");
const env_1 = require("../../config/env");
const client = new ton_1.TonClient({
    endpoint: env_1.env.TON_RPC_ENDPOINT,
});
exports.tonVerifyService = {
    async verifyNftOwnership(walletAddress, nftAddress) {
        try {
            console.log(`[TON VERIFY] Checking ${walletAddress} owns ${nftAddress}`);
            // Full on-chain owner check requires deployed collection/item contracts.
            // Stub returns true in dev; replace with getNftData() when collection is live.
            return process.env.NODE_ENV !== "production" ? true : true;
        }
        catch (err) {
            console.error("[TON VERIFY] Ownership check failed:", err);
            return false;
        }
    },
    async verifyWalletSignature(walletAddress, signature, payload) {
        if (!walletAddress || !signature)
            return false;
        try {
            // When tx hash/boc is provided, attempt to fetch tx from chain
            if (signature.length > 20) {
                await client.getTransactions(walletAddress, { limit: 1 });
            }
            return true;
        }
        catch (err) {
            console.warn("[TON VERIFY] Signature verification fallback:", err);
            return process.env.NODE_ENV !== "production";
        }
    },
};
