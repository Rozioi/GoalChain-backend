import { FastifyInstance } from "fastify";
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
    playerId: string | null;
    ownerAddress: string;
    metadata: TonNftItem["metadata"];
}
export declare const tonApiService: {
    /**
     * Fetch NFTs for a wallet address from TON API
     * GET /v2/accounts/{account_id}/nfts
     */
    fetchWalletNfts(walletAddress: string): Promise<TonNftItem[]>;
    /**
     * Filter NFTs by our collection address and normalize to internal interface
     */
    normalizeNftPlayers(nftItems: TonNftItem[], collectionAddress: string): NormalizedNftPlayer[];
    /**
     * Sync NFTs from TON API and match with our database
     */
    syncWalletNfts(app: FastifyInstance, walletAddress: string): Promise<NormalizedNftPlayer[]>;
};
