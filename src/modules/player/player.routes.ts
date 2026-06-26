import { FastifyInstance } from "fastify";
import { rentController } from "./rent.controller";
import { playerController } from "./player.controller";

export default async function playerRoutes(app: FastifyInstance) {
  app.register(rentController);

  app.post("/players/import", playerController.importFromApi);
  app.get("/players/image/:id", playerController.getPlayerImage);
  app.get("/player/:id", playerController.getPlayerById);
  app.get("/player/:id/nft-metadata", playerController.getNftMetadata);
  app.post("/players/populate", playerController.populate);

  app.addHook("preHandler", app.authenticate);
  app.post("/nft/mint/prepare", playerController.prepareMint);
  app.post("/nft/mint/confirm", playerController.confirmMint);
}
