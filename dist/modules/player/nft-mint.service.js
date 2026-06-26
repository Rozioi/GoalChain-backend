"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nftMintService = void 0;
const core_1 = require("@ton/core");
const nft_metadata_service_1 = require("./nft-metadata.service");
const ton_verify_service_1 = require("../user/ton-verify.service");
const MINT_FEE_NANO = (0, core_1.toNano)("0.05");
function getCollectionAddress() {
    return (process.env.TON_COLLECTION_ADDRESS ||
        "EQC0000000000000000000000000000000000000000000000000000000000000000");
}
function buildMintPayload(playerId, ownerAddress) {
    const queryId = BigInt(Date.now());
    const cell = (0, core_1.beginCell)()
        .storeUint(1, 32)
        .storeUint(queryId, 64)
        .storeAddress(core_1.Address.parse(ownerAddress))
        .storeRef((0, core_1.beginCell)()
        .storeStringTail(`goalchain-player-${playerId}`)
        .endCell())
        .endCell();
    return cell.toBoc().toString("base64");
}
exports.nftMintService = {
    async prepareMint(app, userId, playerId, walletAddress) {
        const player = await app.prisma.player.findFirst({
            where: { id: playerId, ownerId: userId },
        });
        if (!player)
            throw new Error("Player not found");
        if (!player.isNft)
            throw new Error("This player is not eligible for NFT minting");
        if (player.tokenId)
            throw new Error("Player is already minted as NFT");
        if (player.overallRating < 75) {
            throw new Error("Player OVR must be greater than 75 to mint");
        }
        const collectionAddress = getCollectionAddress();
        const payload = buildMintPayload(playerId, walletAddress);
        const metadata = nft_metadata_service_1.nftMetadataService.generatePlayerMetadata(player);
        return {
            validUntil: Math.floor(Date.now() / 1000) + 600,
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
    async confirmMint(app, userId, playerId, walletAddress, txHash) {
        const player = await app.prisma.player.findFirst({
            where: { id: playerId, ownerId: userId },
        });
        if (!player)
            throw new Error("Player not found");
        if (!player.isNft)
            throw new Error("This player is not eligible for NFT minting");
        if (player.tokenId)
            throw new Error("Player is already minted as NFT");
        const verified = await ton_verify_service_1.tonVerifyService.verifyWalletSignature(walletAddress, txHash || "", playerId);
        if (!verified)
            throw new Error("Transaction verification failed");
        const tokenId = txHash || `gc-${playerId.slice(0, 8)}-${Date.now()}`;
        const updated = await app.prisma.player.update({
            where: { id: playerId },
            data: {
                tokenId,
                mintedAt: new Date(),
            },
        });
        return { player: updated, tokenId };
    },
    async getMetadata(app, playerId) {
        const player = await app.prisma.player.findUnique({ where: { id: playerId } });
        if (!player)
            throw new Error("Player not found");
        return nft_metadata_service_1.nftMetadataService.generatePlayerMetadata(player);
    },
};
