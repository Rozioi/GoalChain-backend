import { FastifyReply, FastifyRequest } from "fastify";
import { FootballApiService } from "./football-api.service";
import { getPlayerImage, getPlayerById } from "./player.service";
import { nftMintService } from "./nft-mint.service";

export const playerController = {
    async importFromApi(
        req: FastifyRequest<{
            Body: {
                leagueId: number;
                season?: number;
            };
        }>,
        reply: FastifyReply,
    ) {
        try {
            const apiService = new FootballApiService(req.server);
            const { leagueId, season } = req.body;

            const result = await apiService.importPlayersForLeague(
                leagueId,
                season,
            );
            reply.send(result);
        } catch (err: any) {
            req.server.log.error(err);
            reply.status(500).send({ error: err.message });
        }
    },

    async getPlayerImage(
        req: FastifyRequest<{
            Params: {
                id: string;
            };
        }>,
        reply: FastifyReply,
    ) {
        try {
            const { id } = req.params;
            const player = await getPlayerImage(req.server, id);
            reply.send(player);
        } catch (err: any) {
            req.server.log.error(err);
            reply.status(500).send({ error: err.message });
        }
    },
    async getPlayerById(
        req: FastifyRequest<{
            Params: {
                id: string;
            };
        }>,
        reply: FastifyReply,
    ) {
        try {
            const { id } = req.params;
            const image = await getPlayerById(req.server, id);
            reply.send(image);
        } catch (err: any) {
            req.server.log.error(err);
            reply.status(500).send({ error: err.message });
        }
    },
    async populate(
        req: FastifyRequest<{
            Body: {
                count?: number;
            };
        }>,
        reply: FastifyReply,
    ) {
        try {
            const apiService = new FootballApiService(req.server);
            const result = await apiService.populateInitialDatabase(
                req.body.count,
            );
            reply.send(result);
        } catch (err: any) {
            req.server.log.error(err);
            reply.status(500).send({ error: err.message });
        }
    },

    async getNftMetadata(
        req: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const metadata = await nftMintService.getMetadata(
                req.server,
                req.params.id,
            );
            reply.send(metadata);
        } catch (err: any) {
            reply.status(404).send({ error: err.message });
        }
    },

    async lockPlayer(
        req: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const result = await nftMintService.lockPlayer(
                req.server,
                req.user.userId,
                req.params.id,
            );
            reply.send(result);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },

    async unlockPlayer(
        req: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) {
        try {
            const result = await nftMintService.unlockPlayer(
                req.server,
                req.user.userId,
                req.params.id,
            );
            reply.send(result);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },

    async prepareMint(
        req: FastifyRequest<{
            Body: { playerId: string; walletAddress: string };
        }>,
        reply: FastifyReply,
    ) {
        try {
            const result = await nftMintService.prepareMint(
                req.server,
                req.user.userId,
                req.body.playerId,
                req.body.walletAddress,
            );
            reply.send(result);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },

    async confirmMint(
        req: FastifyRequest<{
            Body: { playerId: string; walletAddress: string; txHash?: string };
        }>,
        reply: FastifyReply,
    ) {
        try {
            const result = await nftMintService.confirmMint(
                req.server,
                req.user.userId,
                req.body.playerId,
                req.body.walletAddress,
                req.body.txHash,
            );
            reply.send(result);
        } catch (err: any) {
            reply.status(400).send({ error: err.message });
        }
    },

    // async webhookValidateMint(
    //     req: FastifyRequest<{
    //         Body: {
    //             transactionComment: string;
    //             senderAddress: string;
    //             txHash: string;
    //         };
    //     }>,
    //     reply: FastifyReply,
    // ) {
    //     try {
    //         const result = await nftMintService.validateMintTransaction(
    //             req.server,
    //             req.body.transactionComment,
    //             req.body.senderAddress,
    //             req.body.txHash,
    //         );
    //         reply.send({ success: result });
    //     } catch (err: any) {
    //         reply.status(400).send({ error: err.message });
    //     }
    // },
};
