"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_controller_1 = require("./user.controller");
async function userRoutes(app) {
    // Public
    app.post("/auth/register", {
        schema: {
            tags: ["Auth"],
            body: {
                type: "object",
                required: ["telegramId"],
                properties: {
                    telegramId: { type: "string" },
                    username: { type: "string" },
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                },
            },
        },
    }, user_controller_1.userController.register);
    // Protected
    app.get("/user/me", {
        schema: {
            tags: ["User"],
        },
        preHandler: [app.authenticate],
    }, user_controller_1.userController.me);
    app.get("/user/referral-code", {
        schema: {
            tags: ["User"],
        },
        preHandler: [app.authenticate],
    }, user_controller_1.userController.getReferralCode);
    app.post("/user/apply-referral", {
        schema: {
            tags: ["User"],
        },
        preHandler: [app.authenticate],
    }, user_controller_1.userController.applyReferral);
    app.get("/user/referrals", {
        schema: {
            tags: ["User"],
        },
        preHandler: [app.authenticate],
    }, user_controller_1.userController.getReferrals);
}
exports.default = userRoutes;
