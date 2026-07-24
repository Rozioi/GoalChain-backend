import { FastifyInstance } from "fastify";
import { beginCell, toNano } from "@ton/core";
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
 * Отправляет запрос на создание NFT через Getgems Minting API.
 * Бросает ошибку если запрос не был принят в очередь.
 * Возвращает requestId для дальнейшей проверки статуса.
 */
async function submitMintRequest(
    collectionAddress: string,
    ownerAddress: string,
    playerId: string,
    player: any,
): Promise<{ requestId: string }> {
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
        image: String(
            metadata.image || "https://goalchain.app/default-player.png",
        ),
        attributes: (metadata.attributes || []).map((attr: any) => ({
            trait_type: String(attr.trait_type),
            value: String(attr.value),
        })),
    };

    console.log("[Getgems] Mint request body:", JSON.stringify(body, null, 2));

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

    console.log("[Getgems] Mint response:", JSON.stringify(data, null, 2));

    if (!response.ok) {
        const errMsg =
            data?.errors?.[0]?.message ||
            data?.error ||
            `HTTP ${response.status}`;
        throw new Error(`Getgems minting failed: ${errMsg}`);
    }

    // Проверяем, что запрос принят в очередь (status === "in_queue")
    // или сразу выполнен (status === "completed")
    if (!data?.success) {
        throw new Error("Getgems minting returned unexpected response");
    }

    return { requestId };
}

/**
 * Ожидает завершения минта через Getgems API с повторными попытками.
 * Getgems возвращает адрес NFT на корневом уровне response,
 * а статус — в response.response.status.
 * Возвращает адрес созданной NFT и ссылку на getgems.
 */
async function pollMintUntilComplete(
    collectionAddress: string,
    requestId: string,
    maxAttempts: number = 30,
    delayMs: number = 2000,
): Promise<{ nftAddress: string; url: string }> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(
            `[Getgems] Polling mint status (attempt ${attempt}/${maxAttempts})...`,
        );

        const statusResult = await checkMintStatus(collectionAddress, requestId);

        console.log(
            `[Getgems] Status check response: status=${statusResult.status}, address=${statusResult.address}`,
        );

        // Getgems может вернуть "completed" или "ready" — оба означают успех
        if (statusResult.status === "completed" || statusResult.status === "ready") {
            if (!statusResult.address) {
                throw new Error(
                    "Getgems mint completed but no NFT address returned",
                );
            }

            // URL берём из ответа или формируем сами
            // В ответе статуса может быть url на корневом уровне
            const baseUrl = getMintingApiBaseUrl().replace("/public-api/minting", "");
            const url = `${baseUrl}/collection/${collectionAddress}/${statusResult.address}`;

            return {
                nftAddress: statusResult.address,
                url,
            };
        }

        if (statusResult.status === "failed") {
            throw new Error("Getgems minting failed (status: failed)");
        }

        // status === "in_queue" или другой промежуточный статус — ждём
        await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    throw new Error(
        `Getgems minting timed out after ${maxAttempts * delayMs}ms`,
    );
}

/**
 * Проверяет статус минта через Getgems API.
 * Адрес NFT может лежать как в data.response.address,
 * так и на корневом уровне data.address (разные версии API).
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

    console.log("[Getgems] Status check raw data:", JSON.stringify(data, null, 2));

    if (!data?.success) {
        throw new Error("Failed to check mint status");
    }

    // Getgems может возвращать address как на корневом уровне, так и в response
    const status = data?.response?.status || data?.status || "unknown";
    const address = data?.response?.address || data?.address || undefined;
    const ownerAddress = data?.response?.ownerAddress || data?.ownerAddress || undefined;

    return { status, address, ownerAddress };
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
     * prepareMint — возвращает данные для TON-транзакции пользователю.
     * Пользователь платит газ сам через TonConnect.
     * После подтверждения транзакции клиент вызывает confirmMint,
     * который уже реально создаёт NFT через Getgems API.
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
            const metadata = nftMetadataService.generatePlayerMetadata(player);
            return {
                devMode: true,
                validUntil: Math.floor(Date.now() / 1000) + 240,
                messages: [
                    {
                        address:
                            "EQD4v8lSHnqc39XxwPq2RzR7oRf6sFc8Ic8CJj9aJFbK8e6k",
                        amount: "1",
                        payload: Buffer.from(`dev-mint:${playerId}`).toString(
                            "base64",
                        ),
                    },
                ],
                metadata,
                playerId,
            };
        }

        // Возвращаем данные для TON-транзакции (символическая плата 0.001 TON)
        // Средства идут на TON_PAYMENT_ADDRESS как комиссия за минт
        // NFT создаётся через Getgems API в confirmMint
        const metadata = nftMetadataService.generatePlayerMetadata(player);
        const mintAmount = toNano("0.01");
        const paymentAddress =
            process.env.TON_PAYMENT_ADDRESS ||
            "UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ";

        const commentCell = beginCell()
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

        let nftAddress: string | null = null;
        let getgemsUrl: string | null = null;

        const collectionAddress = getCollectionAddress();
        const apiKey = getMintingApiKey();
        const canMintViaGetgems = !!collectionAddress && !!apiKey;

        if (canMintViaGetgems) {
            // --- КРИТИЧЕСКИ ВАЖНО: ---
            // 1. Отправляем запрос на минт в Getgems API
            // 2. Ждём завершения минта (поллинг статуса до "completed")
            // 3. Только после получения реального NFT-адреса отмечаем игрока в БД
            //
            // Бэкенд НЕ верит фронтенду на слово — только API коллекции.
            try {
                const { requestId } = await submitMintRequest(
                    collectionAddress,
                    walletAddress,
                    playerId,
                    player,
                );

                app.log.info(
                    `[NFT Mint] Request submitted, requestId=${requestId}, polling for completion...`,
                );

                const result = await pollMintUntilComplete(
                    collectionAddress,
                    requestId,
                );

                nftAddress = result.nftAddress;
                getgemsUrl = result.url;

                app.log.info(
                    `[NFT Mint] Successfully minted NFT: ${nftAddress}`,
                );
            } catch (err: any) {
                app.log.error(
                    "[NFT Mint] Getgems minting failed — mint ABORTED:",
                    err,
                );
                // Разблокируем игрока, чтобы дать шанс повторить попытку
                await app.prisma.player.update({
                    where: { id: playerId },
                    data: { mintingStatus: "none", lockedAt: null },
                });
                throw new Error(
                    `Getgems minting failed: ${err.message}. Player has been unlocked — please try again.`,
                );
            }
        } else if (isMintUnlocked() || process.env.NODE_ENV !== "production") {
            // Dev mode: allow minting without Getgems
            nftAddress = walletAddress;
            app.log.info(
                `[NFT Mint] Dev mode — using wallet address as NFT address: ${nftAddress}`,
            );
        } else {
            throw new Error(
                "Cannot mint: TON_COLLECTION_ADDRESS and GETGEMS_MINTING_API_KEY must be configured",
            );
        }

        // Генерируем tokenId из реального NFT-адреса, полученного от Getgems
        const tokenId = nftAddress
            ? `gc-${nftAddress.slice(-16)}`
            : `gc-${playerId.slice(0, 8)}-${Date.now()}`;

        const updated = await app.prisma.player.update({
            where: { id: playerId },
            data: {
                tokenId,
                nftAddress, // теперь это реальный адрес NFT, а не кошелька пользователя
                mintedAt: new Date(),
                isNft: true,
                mintingStatus: "converted_to_nft",
                lockedAt: null,
            },
        });

        return { player: updated, tokenId, nftAddress, getgemsUrl };
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
