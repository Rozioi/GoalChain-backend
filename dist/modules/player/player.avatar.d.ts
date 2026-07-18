export declare const IPFS_AVATAR_BASE = "https://ipfs.io/ipfs/bafybeia7sdif45zbosyfju3l75q42su3e324vyhq747begn3kghrhce7pi";
export declare function getEthnicityKey(nationality: string): string;
export declare function buildIpfsAvatarUrl(clubId: number, nationality: string, variant: number): string;
export declare function getGeneratedPlayerAvatarUrl(clubId: number, nationality: string, rng: () => number): string;
export declare function getGeneratedPlayerAvatarUrlFromSeed(clubId: number, nationality: string, seed: string): string;
export declare function loadAvatarBuffer(facePath: string): Promise<Buffer | null>;
export declare function loadAvatarBufferWithFallback(facePath: string): Promise<Buffer>;
