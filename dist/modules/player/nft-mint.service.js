"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nftMintService = void 0;
const core_1 = require("@ton/core");
const nft_metadata_service_1 = require("./nft-metadata.service");
const constants_1 = require("../../config/constants");
const env_1 = require("../../config/env");
/**
 * Если NFT_MINT_UNLOCKED=true — пропускаем все проверки условий.
 * Позволяет тестировать минт без OVR 75+ и 100 матчей.
 */
function isMintUnlocked() {
    return env_1.env.NFT_MINT_UNLOCKED === "true";
}
function getCollectionAddress() {
    const addr = process.env.TON_COLLECTION_ADDRESS || "";
    if (addr.startsWith("EQC000"))
        return "";
    return addr;
}
function getMintingApiKey() {
    return process.env.GETGEMS_MINTING_API_KEY || "";
}
/**
 * Базовая URL для Getgems Minting API (testnet по умолчанию).
 */
function getMintingApiBaseUrl() {
    return process.env.GETGEMS_API_URL || "https://api.testnet.getgems.io";
}
/**
 * Создаёт NFT через Getgems Minting API.
 * Возвращает адрес созданной NFT и ссылку на getgems.
 */
async function mintViaGetgemsApi(collectionAddress, ownerAddress, playerId, player) {
    const apiKey = getMintingApiKey();
    if (!apiKey) {
        throw new Error("GETGEMS_MINTING_API_KEY is not configured");
    }
    const requestId = `${playerId}-${Date.now()}`;
    const metadata = nft_metadata_service_1.nftMetadataService.generatePlayerMetadata(player);
    const body = {
        requestId,
        ownerAddress,
        name: metadata.name,
        description: metadata.description,
        image: String(metadata.image || "https://goalchain.app/default-player.png"),
        attributes: (metadata.attributes || []).map((attr) => ({
            trait_type: String(attr.trait_type),
            value: String(attr.value),
        })),
    };
    console.log("[Getgems] Mint request body:", JSON.stringify(body, null, 2));
    const response = await fetch(`${getMintingApiBaseUrl()}/public-api/minting/${collectionAddress}`, {
        method: "POST",
        headers: {
            accept: "application/json",
            Authorization: apiKey,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    const data = await response.json();
    console.log("[Getgems] Mint response:", JSON.stringify(data, null, 2));
    if (!response.ok) {
        const errMsg = data?.errors?.[0]?.message ||
            data?.error ||
            `HTTP ${response.status}`;
        throw new Error(`Getgems minting failed: ${errMsg}`);
    }
    if (!data?.success || !data?.response?.address) {
        throw new Error("Getgems minting returned unexpected response");
    }
    return {
        nftAddress: data.response.address,
        url: data.response.url || "",
    };
}
/**
 * Проверяет статус минта через Getgems API.
 */
async function checkMintStatus(collectionAddress, requestId) {
    const apiKey = getMintingApiKey();
    const response = await fetch(`${getMintingApiBaseUrl()}/public-api/minting/${collectionAddress}/${requestId}`, {
        headers: {
            accept: "application/json",
            Authorization: apiKey,
        },
    });
    const data = await response.json();
    if (!data?.success) {
        throw new Error("Failed to check mint status");
    }
    return {
        status: data.response.status,
        address: data.response.address,
        ownerAddress: data.response.ownerAddress,
    };
}
exports.nftMintService = {
    /**
     * Lock player for minting (sets minting_status to "minting_process")
     */
    async lockPlayer(app, userId, playerId) {
        const player = await app.prisma.player.findFirst({
            where: { id: playerId, ownerId: userId },
        });
        if (!player)
            throw new Error("Player not found");
        if (player.tokenId)
            throw new Error("Player is already minted as NFT");
        if (player.mintingStatus === "minting_process") {
            throw new Error("Player is already in minting process");
        }
        // Check conversion conditions (skip if NFT_MINT_UNLOCKED=true)
        if (!isMintUnlocked()) {
            if (player.overallRating < constants_1.NFT.MIN_OVR_FOR_MINT) {
                throw new Error(`Player OVR must be at least ${constants_1.NFT.MIN_OVR_FOR_MINT} to mint`);
            }
            if (player.matchesPlayed < constants_1.NFT.MIN_MATCHES_FOR_MINT) {
                throw new Error(`Player must play at least ${constants_1.NFT.MIN_MATCHES_FOR_MINT} matches to mint (current: ${player.matchesPlayed})`);
            }
        }
        const updated = await app.prisma.player.update({
            where: { id: playerId },
            data: {
                mintingStatus: "minting_process",
                lockedAt: new Date(),
            },
        });
        return updated;
    },
    /**
     * Unlock player (cancel minting process)
     */
    async unlockPlayer(app, userId, playerId) {
        const player = await app.prisma.player.findFirst({
            where: { id: playerId, ownerId: userId },
        });
        if (!player)
            throw new Error("Player not found");
        if (player.mintingStatus !== "minting_process") {
            throw new Error("Player is not in minting process");
        }
        const updated = await app.prisma.player.update({
            where: { id: playerId },
            data: {
                mintingStatus: "none",
                lockedAt: null,
            },
        });
        return updated;
    },
    /**
     * prepareMint — возвращает данные для TON-транзакции пользователю.
     * Пользователь платит газ сам через TonConnect.
     * После подтверждения транзакции клиент вызывает confirmMint,
     * который уже реально создаёт NFT через Getgems API.
     */
    async prepareMint(app, userId, playerId, walletAddress) {
        const player = await app.prisma.player.findFirst({
            where: { id: playerId, ownerId: userId },
        });
        if (!player)
            throw new Error("Player not found");
        if (player.tokenId)
            throw new Error("Player is already minted as NFT");
        if (player.mintingStatus !== "minting_process") {
            throw new Error("Player must be locked for minting first. Call /players/{id}/lock");
        }
        // Check lock expiration (10 min)
        if (player.lockedAt) {
            const elapsed = Date.now() - player.lockedAt.getTime();
            if (elapsed > constants_1.NFT.MINT_LOCK_DURATION_MS) {
                await app.prisma.player.update({
                    where: { id: playerId },
                    data: { mintingStatus: "none", lockedAt: null },
                });
                throw new Error("Minting lock expired. Please lock the player again.");
            }
        }
        const collectionAddress = getCollectionAddress();
        const apiKey = getMintingApiKey();
        const isDevMode = !collectionAddress || !apiKey;
        if (!collectionAddress) {
            if (process.env.NODE_ENV === "production") {
                throw new Error("TON_COLLECTION_ADDRESS is not configured");
            }
        }
        if (isDevMode) {
            const metadata = nft_metadata_service_1.nftMetadataService.generatePlayerMetadata(player);
            return {
                devMode: true,
                validUntil: Math.floor(Date.now() / 1000) + 240,
                messages: [
                    {
                        address: "EQD4v8lSHnqc39XxwPq2RzR7oRf6sFc8Ic8CJj9aJFbK8e6k",
                        amount: "1",
                        payload: Buffer.from(`dev-mint:${playerId}`).toString("base64"),
                    },
                ],
                metadata,
                playerId,
            };
        }
        // Возвращаем данные для TON-транзакции (символическая плата 0.001 TON)
        // Средства идут на TON_PAYMENT_ADDRESS как комиссия за минт
        // NFT создаётся через Getgems API в confirmMint
        const metadata = nft_metadata_service_1.nftMetadataService.generatePlayerMetadata(player);
        const mintAmount = (0, core_1.toNano)("1.000");
        const paymentAddress = process.env.TON_PAYMENT_ADDRESS ||
            "UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ";
        const commentCell = (0, core_1.beginCell)()
            .storeStringTail(`mint:${playerId}`)
            .endCell();
        return {
            devMode: false,
            validUntil: Math.floor(Date.now() / 1000) + 240,
            messages: [
                {
                    address: paymentAddress,
                    amount: mintAmount.toString(),
                    payload: commentCell.toBoc().toString("base64"),
                },
            ],
            metadata,
            playerId,
        };
    },
    async confirmMint(app, userId, playerId, walletAddress, txHash) {
        const player = await app.prisma.player.findFirst({
            where: { id: playerId, ownerId: userId },
        });
        if (!player)
            throw new Error("Player not found");
        if (player.tokenId)
            throw new Error("Player is already minted as NFT");
        if (player.mintingStatus !== "minting_process") {
            throw new Error("Player is not in minting process");
        }
        // Если есть txHash — пользователь оплатил, создаём NFT через Getgems API
        if (txHash) {
            const collectionAddress = getCollectionAddress();
            const apiKey = getMintingApiKey();
            if (collectionAddress && apiKey) {
                try {
                    const result = await mintViaGetgemsApi(collectionAddress, walletAddress, playerId, player);
                    app.log.info(`[NFT Mint] Created via Getgems: ${result.nftAddress}`);
                }
                catch (err) {
                    app.log.error("[NFT Mint] Getgems API error (non-fatal):", err);
                    // Продолжаем даже если Getgems API упал
                }
            }
        }
        const tokenId = txHash
            ? `gc-${txHash.slice(0, 16)}`
            : `gc-${playerId.slice(0, 8)}-${Date.now()}`;
        const updated = await app.prisma.player.update({
            where: { id: playerId },
            data: {
                tokenId,
                nftAddress: walletAddress,
                mintedAt: new Date(),
                isNft: true,
                mintingStatus: "converted_to_nft",
                lockedAt: null,
            },
        });
        return { player: updated, tokenId };
    },
    /**
     * Получение метаданных NFT
     */
    async getMetadata(app, playerId) {
        const player = await app.prisma.player.findUnique({
            where: { id: playerId },
        });
        if (!player)
            throw new Error("Player not found");
        return nft_metadata_service_1.nftMetadataService.generatePlayerMetadata(player);
    },
};
