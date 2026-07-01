import { FastifyInstance } from "fastify";
import { beginCell, toNano, Address } from "@ton/core";
import { nftMetadataService } from "./nft-metadata.service";
import { NFT } from "../../config/constants";
import { env } from "../../config/env";

const MINT_FEE_NANO = toNano("0.10");

/**
 * Если NFT_MINT_UNLOCKED=true — пропускаем все проверки условий.
 * Позволяет тестировать минт без OVR 75+ и 100 матчей.
 */
function isMintUnlocked(): boolean {
    return env.NFT_MINT_UNLOCKED === "true";
}

function getCollectionAddress(): string {
    const addr = process.env.TON_COLLECTION_ADDRESS || "";
    // Считаем заглушку как "не настроено"
    if (addr.startsWith("EQC000")) return "";
    return addr;
}

function buildMintPayload(playerId: string, ownerAddress: string): string {
    const queryId = BigInt(Date.now());
    const cell = beginCell()
        .storeUint(1, 32) // Op code for NFT mint
        .storeUint(queryId, 64)
        .storeAddress(Address.parse(ownerAddress))
        .storeRef(
            beginCell()
                // Embed Player_ID into the transaction comment
                .storeStringTail(`mint:${playerId}`)
                .endCell(),
        )
        .endCell();

    return cell.toBoc().toString("base64");
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
                // Auto-unlock expired lock
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
        const metadata = nftMetadataService.generatePlayerMetadata(player);

        // Если адрес коллекции не настроен — имитируем (dev/test mode)
        const isDevMode = !collectionAddress;

        if (!collectionAddress) {
            if (process.env.NODE_ENV === "production") {
                throw new Error("TON_COLLECTION_ADDRESS is not configured");
            }
            // В dev-режиме работаем без реальной коллекции
        }

        if (isDevMode) {
            // Dev mode: не шлём реальную TON транзакцию
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

        const payload = buildMintPayload(playerId, walletAddress);

        return {
            validUntil: Math.floor(Date.now() / 1000) + 240,
            messages: [
                {
                    address: collectionAddress,
                    amount: MINT_FEE_NANO.toString(),
                    payload,
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

        // Generate token ID from tx hash or fallback
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
     * Validate a mint transaction (called from webhook or polling)
     * Extracts Player_ID from transaction comment and validates conditions
     */
    async validateMintTransaction(
        app: FastifyInstance,
        transactionComment: string,
        senderAddress: string,
        txHash: string,
    ) {
        // Parse Player_ID from comment format "mint:playerId"
        const match = transactionComment.match(/^mint:(.+)$/);
        if (!match) {
            app.log.warn(
                `Invalid transaction comment format: ${transactionComment}`,
            );
            return false;
        }

        const playerId = match[1];
        const player = await app.prisma.player.findUnique({
            where: { id: playerId },
        });

        if (!player) {
            app.log.warn(`Player not found for mint tx: ${playerId}`);
            return false;
        }

        // Validate minting process status
        if (player.mintingStatus !== "minting_process") {
            app.log.warn(
                `Player ${playerId} is not in minting_process (status: ${player.mintingStatus})`,
            );
            return false; // Cheater: direct mint without lock
        }

        // Validate conditions (skip if NFT_MINT_UNLOCKED=true)
        if (!isMintUnlocked()) {
            if (player.overallRating < NFT.MIN_OVR_FOR_MINT) {
                app.log.warn(
                    `Player ${playerId} OVR ${player.overallRating} < ${NFT.MIN_OVR_FOR_MINT}`,
                );
                return false;
            }

            if (player.matchesPlayed < NFT.MIN_MATCHES_FOR_MINT) {
                app.log.warn(
                    `Player ${playerId} matches ${player.matchesPlayed} < ${NFT.MIN_MATCHES_FOR_MINT}`,
                );
                return false;
            }
        }

        // All conditions passed, convert to NFT
        const tokenId = `gc-${txHash.slice(0, 16)}`;

        await app.prisma.player.update({
            where: { id: playerId },
            data: {
                tokenId,
                nftAddress: senderAddress,
                mintedAt: new Date(),
                isNft: true,
                mintingStatus: "converted_to_nft",
                lockedAt: null,
            },
        });

        app.log.info(
            `Player ${playerId} successfully converted to NFT via webhook validation`,
        );
        return true;
    },

    async getMetadata(app: FastifyInstance, playerId: string) {
        const player = await app.prisma.player.findUnique({
            where: { id: playerId },
        });
        if (!player) throw new Error("Player not found");
        return nftMetadataService.generatePlayerMetadata(player);
    },
};
