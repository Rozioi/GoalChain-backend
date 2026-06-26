"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = playerRoutes;
const rent_controller_1 = require("./rent.controller");
const player_controller_1 = require("./player.controller");
async function playerRoutes(app) {
    app.register(rent_controller_1.rentController);
    app.post("/players/import", player_controller_1.playerController.importFromApi);
    app.get("/players/image/:id", player_controller_1.playerController.getPlayerImage);
    app.get("/player/:id", player_controller_1.playerController.getPlayerById);
    app.get("/player/:id/nft-metadata", player_controller_1.playerController.getNftMetadata);
    app.post("/players/populate", player_controller_1.playerController.populate);
    app.addHook("preHandler", app.authenticate);
    app.post("/nft/mint/prepare", player_controller_1.playerController.prepareMint);
    app.post("/nft/mint/confirm", player_controller_1.playerController.confirmMint);
}
