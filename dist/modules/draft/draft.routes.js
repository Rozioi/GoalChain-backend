"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const draft_controller_1 = require("./draft.controller");
async function draftRoutes(app) {
    app.addHook("preHandler", app.authenticate);
    app.post("/draft/start", {
        schema: {
            tags: ["Draft"],
        },
    }, draft_controller_1.draftController.start);
    app.get("/draft/options/:step", {
        schema: {
            tags: ["Draft"],
            params: {
                type: "object",
                required: ["step"],
                properties: {
                    step: { type: "string", enum: ["gk", "def", "mid", "fwd"] },
                },
            },
        },
    }, draft_controller_1.draftController.getOptions);
    app.post("/draft/pick", {
        schema: {
            tags: ["Draft"],
            body: {
                type: "object",
                required: ["optionIds"],
                properties: {
                    optionIds: {
                        type: "array",
                        items: { type: "string" },
                    },
                },
            },
        },
    }, draft_controller_1.draftController.pick);
    app.post("/draft/complete", {
        schema: {
            tags: ["Draft"],
        },
    }, draft_controller_1.draftController.complete);
}
exports.default = draftRoutes;
