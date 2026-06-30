import { FastifyInstance } from "fastify";
import { env } from "../../config/env";

export interface TonNftItem {
  address: string;
  owner: string;
  collection: {
    address: string;
    name: string;
  } | null;
  metadata: {
    name?: string;
    description?: string;
    image?: string;
    attributes?: Array<{
      trait_type: string;
      value: string | number;
    }>;
  };
}

export interface NormalizedNftPlayer {
  nftAddress: string;
  tokenId: string;
  playerId: string | null; // parsed from metadata
  ownerAddress: string;
  metadata: TonNftItem["metadata"];
}

export const tonApiService = {
  /**
   * Fetch NFTs for a wallet address from TON API
   * GET /v2/accounts/{account_id}/nfts
   */
  async fetchWalletNfts(walletAddress: string): Promise<TonNftItem[]> {
    const baseUrl = env.TON_RPC_ENDPOINT.replace("/jsonRPC", "");
    const url = `${baseUrl}/v2/accounts/${walletAddress}/nfts`;

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        console.warn(`[TON API] Failed to fetch NFTs: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return data.nftItems || data.nfts || [];
    } catch (err) {
      console.error("[TON API] Error fetching wallet NFTs:", err);
      return [];
    }
  },

  /**
   * Filter NFTs by our collection address and normalize to internal interface
   */
  normalizeNftPlayers(
    nftItems: TonNftItem[],
    collectionAddress: string,
  ): NormalizedNftPlayer[] {
    if (!collectionAddress) return [];

    const normalizedAddress = collectionAddress.toLowerCase();

    return nftItems
      .filter((item) => {
        const itemCollection = item.collection?.address?.toLowerCase() || "";
        return itemCollection === normalizedAddress;
      })
      .map((item) => {
        // Try to extract playerId from comment in metadata
        let playerId: string | null = null;
        const description = item.metadata?.description || "";
        const commentMatch = description.match(/player[_-]?id[=:]\s*([a-f0-9-]+)/i);
        if (commentMatch) {
          playerId = commentMatch[1];
        }

        return {
          nftAddress: item.address,
          tokenId: item.address.split("/").pop() || item.address,
          playerId,
          ownerAddress: item.owner,
          metadata: item.metadata,
        };
      });
  },

  /**
   * Sync NFTs from TON API and match with our database
   */
  async syncWalletNfts(
    app: FastifyInstance,
    walletAddress: string,
  ): Promise<NormalizedNftPlayer[]> {
    const collectionAddress = env.TON_COLLECTION_ADDRESS;
    if (!collectionAddress) {
      app.log.warn("TON_COLLECTION_ADDRESS not configured");
      return [];
    }

    const nftItems = await this.fetchWalletNfts(walletAddress);
    const normalized = this.normalizeNftPlayers(nftItems, collectionAddress);

    // Enrich with our database info
    const enriched: NormalizedNftPlayer[] = [];
    for (const nft of normalized) {
      let playerId = nft.playerId;

      if (!playerId) {
        // Try to find by tokenId in our DB
        const dbPlayer = await app.prisma.player.findFirst({
          where: { tokenId: nft.tokenId, isNft: true },
          select: { id: true },
        });
        if (dbPlayer) {
          playerId = dbPlayer.id;
        }
      }

      enriched.push({ ...nft, playerId });
    }

    return enriched;
  },
};
