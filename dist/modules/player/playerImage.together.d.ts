export declare function buildPlayerImagePrompt(player: {
    name: string;
    surname: string;
    nationality: string;
    club: string;
}): string;

export declare function generatePlayerImage(
    player: {
        name: string;
        surname: string;
        nationality: string;
        club: string;
    },
    fileNameRaw?: string,
): Promise<string>;
