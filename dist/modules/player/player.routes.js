"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = playerRoutes;
const rent_controller_1 = require("./rent.controller");
const player_controller_1 = require("./player.controller");
async function playerRoutes(app) {
    app.register(rent_controller_1.rentController);
    app.post("/players/import", player_controller_1.playerController.importFromApi);
    app.get("/players/image/:id", player_controller_1.playerController.getPlayerImage);
    app.post("/players/populate", player_controller_1.playerController.populate);
}
