import { FastifyInstance } from "fastify";
import { nftMetadataService } from "./nft-metadata.service";
import { NFT } from "../../config/constants";
import { env } from "../../config/env";

/**
 * Если NFT_MINT_UNLOCKED=true — пропускаем все проверки условий.
 * Позволяет тестировать минт без OVR 75+ и 100 матчей.
 */
function isMintUnlocked(): boolean {
    return env.NFT_MINT_UNLOCKED === "true";
}

function getCollectionAddress(): string {
    const addr = process.env.TON_COLLECTION_ADDRESS || "";
    if (addr.startsWith("EQC000")) return "";
    return addr;
}

function getMintingApiKey(): string {
    return process.env.GETGEMS_MINTING_API_KEY || "";
}

/**
 * Базовая URL для Getgems Minting API (testnet по умолчанию).
 */
function getMintingApiBaseUrl(): string {
    return process.env.GETGEMS_API_URL || "https://api.testnet.getgems.io";
}

/**
 * Создаёт NFT через Getgems Minting API.
 * Возвращает адрес созданной NFT и ссылку на getgems.
 */
async function mintViaGetgemsApi(
    collectionAddress: string,
    ownerAddress: string,
    playerId: string,
    player: any,
): Promise<{ nftAddress: string; url: string }> {
    const apiKey = getMintingApiKey();
    if (!apiKey) {
        throw new Error("GETGEMS_MINTING_API_KEY is not configured");
    }

    const requestId = `${playerId}-${Date.now()}`;
    const metadata = nftMetadataService.generatePlayerMetadata(player);

    const body = {
        requestId,
        ownerAddress,
        name: metadata.name,
        description: metadata.description,
        image: metadata.image,
        attributes: metadata.attributes,
    };

    const response = await fetch(
        `${getMintingApiBaseUrl()}/public-api/minting/${collectionAddress}`,
        {
            method: "POST",
            headers: {
                accept: "application/json",
                Authorization: apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        },
    );

    const data = await response.json();

    if (!response.ok) {
        const errMsg =
            data?.errors?.[0]?.message ||
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
async function checkMintStatus(
    collectionAddress: string,
    requestId: string,
): Promise<{ status: string; address?: string; ownerAddress?: string }> {
    const apiKey = getMintingApiKey();
    const response = await fetch(
        `${getMintingApiBaseUrl()}/public-api/minting/${collectionAddress}/${requestId}`,
        {
            headers: {
                accept: "application/json",
                Authorization: apiKey,
            },
        },
    );

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

export const nftMintService = {
    /**
     * Lock player for minting (sets minting_status to "minting_process")
     */
    async lockPlayer(app: FastifyInstance, userId: string, playerId: string) {
        const player = await app.prisma.player.findFirst({
            where: { id: playerId, ownerId: userId },
        });

        if (!player) throw new Error("Player not found");
        if (player.tokenId) throw new Error("Player is already minted as NFT");
        if (player.mintingStatus === "minting_process") {
            throw new Error("Player is already in minting process");
        }

        // Check conversion conditions (skip if NFT_MINT_UNLOCKED=true)
        if (!isMintUnlocked()) {
            if (player.overallRating < NFT.MIN_OVR_FOR_MINT) {
                throw new Error(
                    `Player OVR must be at least ${NFT.MIN_OVR_FOR_MINT} to mint`,
                );
            }
            if (player.matchesPlayed < NFT.MIN_MATCHES_FOR_MINT) {
                throw new Error(
                    `Player must play at least ${NFT.MIN_MATCHES_FOR_MINT} matches to mint (current: ${player.matchesPlayed})`,
                );
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
    async unlockPlayer(app: FastifyInstance, userId: string, playerId: string) {
        const player = await app.prisma.player.findFirst({
            where: { id: playerId, ownerId: userId },
        });

        if (!player) throw new Error("Player not found");
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
     * prepareMint — возвращает данные для клиента.
     * Если GETGEMS_MINTING_API_KEY не задан — включает dev-mode.
     */
    async prepareMint(
        app: FastifyInstance,
        userId: string,
        playerId: string,
        walletAddress: string,
    ) {
        const player = await app.prisma.player.findFirst({
            where: { id: playerId, ownerId: userId },
        });

        if (!player) throw new Error("Player not found");
        if (player.tokenId) throw new Error("Player is already minted as NFT");
        if (player.mintingStatus !== "minting_process") {
            throw new Error(
                "Player must be locked for minting first. Call /players/{id}/lock",
            );
        }

        // Check lock expiration (10 min)
        if (player.lockedAt) {
            const elapsed = Date.now() - player.lockedAt.getTime();
            if (elapsed > NFT.MINT_LOCK_DURATION_MS) {
                await app.prisma.player.update({
                    where: { id: playerId },
                    data: { mintingStatus: "none", lockedAt: null },
                });
                throw new Error(
                    "Minting lock expired. Please lock the player again.",
                );
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
            // Dev mode: не шлём реальный запрос к Getgems API
            const metadata = nftMetadataService.generatePlayerMetadata(player);
            return {
                devMode: true,
                metadata,
                playerId,
            };
        }

        // Реальный минт через Getgems API
        try {
            const result = await mintViaGetgemsApi(
                collectionAddress,
                walletAddress,
                playerId,
                player,
            );

            return {
                devMode: false,
                nftAddress: result.nftAddress,
                url: result.url,
                playerId,
            };
        } catch (err: any) {
            app.log.error("[NFT Mint] Getgems API error:", err);
            throw new Error(err.message || "Minting failed");
        }
    },

    async confirmMint(
        app: FastifyInstance,
        userId: string,
        playerId: string,
        walletAddress: string,
        txHash?: string,
    ) {
        const player = await app.prisma.player.findFirst({
            where: { id: playerId, ownerId: userId },
        });

        if (!player) throw new Error("Player not found");
        if (player.tokenId) throw new Error("Player is already minted as NFT");
        if (player.mintingStatus !== "minting_process") {
            throw new Error("Player is not in minting process");
        }

        const tokenId = `gc-${playerId.slice(0, 8)}-${Date.now()}`;

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
    async getMetadata(app: FastifyInstance, playerId: string) {
        const player = await app.prisma.player.findUnique({
            where: { id: playerId },
        });
        if (!player) throw new Error("Player not found");
        return nftMetadataService.generatePlayerMetadata(player);
    },
};
