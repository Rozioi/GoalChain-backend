"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_controller_1 = require("./user.controller");
async function userRoutes(app) {
    // --- AUTH RUNS ---
    app.post("/auth/login", {
        schema: {
            tags: ["Auth"],
            body: {
                type: "object",
                required: ["initData"],
                properties: {
                    initData: { type: "string" },
                },
            },
        },
    }, user_controller_1.userController.login);
    app.post("/auth/register", {
        schema: {
            tags: ["Auth"],
            body: {
                type: "object",
                required: ["initData", "clubInfo"],
                properties: {
                    initData: { type: "string" },
                    clubInfo: {
                        type: "object",
                        required: ["clubName"],
                        properties: {
                            clubName: { type: "string" },
                            clubIcon: { type: "string" },
                        },
                    },
                },
            },
        },
    }, user_controller_1.userController.register);
    app.delete("/users/:id", {
        schema: {
            tags: ["Admin"],
            params: {
                type: "object",
                required: ["id"],
                properties: {
                    id: { type: "string" },
                },
            },
        },
    }, user_controller_1.userController.deleteUser);
    // --- USER PROFILE RUNS ---
    app.post("/user/sync-telegram", {
        schema: {
            tags: ["User"],
            body: {
                type: "object",
                required: ["initData"],
                properties: {
                    initData: { type: "string" },
                },
            },
        },
        preHandler: [app.authenticate],
    }, user_controller_1.userController.syncTelegram);
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
    app.get("/user/inviter/:code", {
        schema: {
            tags: ["User"],
            params: {
                type: "object",
                required: ["code"],
                properties: {
                    code: { type: "string" },
                },
            },
        },
        preHandler: [app.authenticate],
    }, user_controller_1.userController.getInviterInfo);
    app.get("/user/global-rank", {
        schema: {
            tags: ["User"],
        },
        preHandler: [app.authenticate],
    }, user_controller_1.userController.getGlobalRank);
    app.get("/user/leaderboard", {
        schema: {
            tags: ["User"],
        },
        preHandler: [app.authenticate],
    }, user_controller_1.userController.getLeaderboard);
}
exports.default = userRoutes;
