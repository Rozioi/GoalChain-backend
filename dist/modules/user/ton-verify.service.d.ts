/**
 * Stub service for verifying TON NFT ownership and wallet signatures.
 * To implement fully, install '@ton/ton' or 'tonweb' and connect to an RPC provider like Toncenter.
 */
export declare const tonVerifyService: {
    /**
     * Verifies if a given wallet address holds a specific NFT token ID.
     * @param walletAddress The user's TON wallet address
     * @param nftAddress The specific NFT item address
     */
    verifyNftOwnership(walletAddress: string, nftAddress: string): Promise<boolean>;
    /**
     * Verifies a payload signed by the user's wallet (e.g., via TON Connect)
     */
    verifyWalletSignature(walletAddress: string, signature: string, payload: string): Promise<boolean>;
};
