import { FastifyInstance } from "fastify";
import { rentController } from "./rent.controller";
import { playerController } from "./player.controller";

export default async function playerRoutes(app: FastifyInstance) {
  app.register(rentController);

  app.post("/players/import", playerController.importFromApi);
  app.get("/players/image/:id", playerController.getPlayerImage);
  app.post("/players/populate", playerController.populate);
}
