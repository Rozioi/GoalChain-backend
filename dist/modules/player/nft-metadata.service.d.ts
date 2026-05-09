import { Player } from "@prisma/client";
export declare const nftMetadataService: {
    generatePlayerMetadata(player: Player): {
        name: string;
        description: string;
        image: string;
        attributes: ({
            trait_type: string;
            value: number;
        } | {
            trait_type: string;
            value: string;
        })[];
    };
};
