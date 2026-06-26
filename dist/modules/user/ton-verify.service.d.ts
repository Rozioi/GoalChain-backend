export declare const tonVerifyService: {
    verifyNftOwnership(walletAddress: string, nftAddress: string): Promise<boolean>;
    verifyWalletSignature(walletAddress: string, signature: string, payload: string): Promise<boolean>;
};
