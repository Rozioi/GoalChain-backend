"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
const fastify_1 = __importDefault(require("fastify"));
const prisma_plugin_1 = __importDefault(require("./plugins/prisma.plugin"));
const cors_plugin_1 = __importDefault(require("./plugins/cors.plugin"));
const auth_plugin_1 = __importDefault(require("./plugins/auth.plugin"));
const swagger_1 = __importDefault(require("./plugins/swagger"));
const user_routes_1 = __importDefault(require("./modules/user/user.routes"));
const draft_routes_1 = __importDefault(require("./modules/draft/draft.routes"));
const team_routes_1 = __importDefault(require("./modules/team/team.routes"));
const match_routes_1 = __importDefault(require("./modules/match/match.routes"));
const training_routes_1 = __importDefault(require("./modules/training/training.routes"));
const scouting_routes_1 = __importDefault(require("./modules/scouting/scouting.routes"));
const season_routes_1 = __importDefault(require("./modules/season/season.routes"));
const event_routes_1 = __importDefault(require("./modules/event/event.routes"));
function buildApp() {
    const app = (0, fastify_1.default)({ logger: true });
    // Plugins
    app.register(cors_plugin_1.default);
    app.register(prisma_plugin_1.default);
    app.register(auth_plugin_1.default);
    app.register(swagger_1.default);
    // Modules
    app.register(user_routes_1.default, { prefix: "/api/v1" });
    app.register(draft_routes_1.default, { prefix: "/api/v1" });
    app.register(team_routes_1.default, { prefix: "/api/v1" });
    app.register(match_routes_1.default, { prefix: "/api/v1" });
    app.register(training_routes_1.default, { prefix: "/api/v1" });
    app.register(scouting_routes_1.default, { prefix: "/api/v1" });
    app.register(season_routes_1.default, { prefix: "/api/v1" });
    app.register(event_routes_1.default, { prefix: "/api/v1" });
    // Health check
    app.get("/api/v1/health", async () => ({
        status: "ok",
        timestamp: new Date().toISOString(),
    }));
    return app;
}
