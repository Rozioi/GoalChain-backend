"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const season_controller_1 = require("./season.controller");
async function seasonRoutes(app) {
    app.addHook("preHandler", app.authenticate);
    app.get("/season/current", {
        schema: {
            tags: ["Season"],
        },
    }, season_controller_1.seasonController.current);
    app.get("/season/standings/:seasonId", {
        schema: {
            tags: ["Season"],
        },
    }, season_controller_1.seasonController.standings);
    app.post("/season/register", {
        schema: {
            tags: ["Season"],
        },
    }, season_controller_1.seasonController.register);
    app.post("/season/play", {
        schema: {
            tags: ["Season"],
            summary: "Сыграть сезонный матч",
        },
    }, season_controller_1.seasonController.play);
}
exports.default = seasonRoutes;
