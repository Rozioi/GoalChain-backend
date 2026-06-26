import { FastifyInstance } from "fastify";
import { beginCell, toNano, Address } from "@ton/core";
import { nftMetadataService } from "./nft-metadata.service";
import { tonVerifyService } from "../user/ton-verify.service";

const MINT_FEE_NANO = toNano("0.05");

function getCollectionAddress(): string {
  return (
    process.env.TON_COLLECTION_ADDRESS ||
    "EQC0000000000000000000000000000000000000000000000000000000000000000"
  );
}

function buildMintPayload(playerId: string, ownerAddress: string): string {
  const queryId = BigInt(Date.now());
  const cell = beginCell()
    .storeUint(1, 32)
    .storeUint(queryId, 64)
    .storeAddress(Address.parse(ownerAddress))
    .storeRef(
      beginCell()
        .storeStringTail(`goalchain-player-${playerId}`)
        .endCell(),
    )
    .endCell();

  return cell.toBoc().toString("base64");
}

export const nftMintService = {
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
    if (!player.isNft) throw new Error("This player is not eligible for NFT minting");
    if (player.tokenId) throw new Error("Player is already minted as NFT");
    if (player.overallRating < 75) {
      throw new Error("Player OVR must be greater than 75 to mint");
    }

    const collectionAddress = getCollectionAddress();
    const payload = buildMintPayload(playerId, walletAddress);
    const metadata = nftMetadataService.generatePlayerMetadata(player);

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
    if (!player.isNft) throw new Error("This player is not eligible for NFT minting");
    if (player.tokenId) throw new Error("Player is already minted as NFT");

    const verified = await tonVerifyService.verifyWalletSignature(
      walletAddress,
      txHash || "",
      playerId,
    );
    if (!verified) throw new Error("Transaction verification failed");

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

  async getMetadata(app: FastifyInstance, playerId: string) {
    const player = await app.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) throw new Error("Player not found");
    return nftMetadataService.generatePlayerMetadata(player);
  },
};
