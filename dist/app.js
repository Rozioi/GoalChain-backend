"use strict";
// deep imports
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
const fastify_1 = __importDefault(require("fastify"));
const path_1 = __importDefault(require("path"));
const static_1 = __importDefault(require("@fastify/static"));
// plugin imports
const prisma_plugin_1 = __importDefault(require("./plugins/prisma.plugin"));
const cors_plugin_1 = __importDefault(require("./plugins/cors.plugin"));
const auth_plugin_1 = __importDefault(require("./plugins/auth.plugin"));
const swagger_1 = __importDefault(require("./plugins/swagger"));
// routes importa
const user_routes_1 = __importDefault(require("./modules/user/user.routes"));
const draft_routes_1 = __importDefault(require("./modules/draft/draft.routes"));
const team_routes_1 = __importDefault(require("./modules/team/team.routes"));
const match_routes_1 = __importDefault(require("./modules/match/match.routes"));
const training_routes_1 = __importDefault(require("./modules/training/training.routes"));
const scouting_routes_1 = __importDefault(require("./modules/scouting/scouting.routes"));
const season_routes_1 = __importDefault(require("./modules/season/season.routes"));
const event_routes_1 = __importDefault(require("./modules/event/event.routes"));
const task_routes_1 = __importDefault(require("./modules/task/task.routes"));
const admin_task_routes_1 = __importDefault(require("./modules/task/admin.task.routes"));
const admin_routes_1 = __importDefault(require("./modules/admin/admin.routes"));
const player_routes_1 = __importDefault(require("./modules/player/player.routes"));
const pressure_plugin_1 = __importDefault(require("./plugins/pressure.plugin"));
const caching_plugin_1 = __importDefault(require("./plugins/caching.plugin"));
const sync_plugin_1 = __importDefault(require("./plugins/sync.plugin"));
// function buildApp (check documentation)
function buildApp() {
    const app = (0, fastify_1.default)({
        logger: true,
        pluginTimeout: 30000,
    });
    // plugin register
    app.register(cors_plugin_1.default);
    app.register(prisma_plugin_1.default);
    app.register(auth_plugin_1.default);
    app.register(swagger_1.default);
    app.register(pressure_plugin_1.default);
    app.register(caching_plugin_1.default);
    app.register(sync_plugin_1.default);
    // route register
    app.register(user_routes_1.default, { prefix: "/api/v1" });
    app.register(draft_routes_1.default, { prefix: "/api/v1" });
    app.register(team_routes_1.default, { prefix: "/api/v1" });
    app.register(match_routes_1.default, { prefix: "/api/v1" });
    app.register(training_routes_1.default, { prefix: "/api/v1" });
    app.register(scouting_routes_1.default, { prefix: "/api/v1" });
    app.register(season_routes_1.default, { prefix: "/api/v1" });
    app.register(event_routes_1.default, { prefix: "/api/v1" });
    app.register(task_routes_1.default, { prefix: "/api/v1" });
    app.register(admin_task_routes_1.default, { prefix: "/api/v1" });
    app.register(admin_routes_1.default, { prefix: "/api/v1" });
    app.register(player_routes_1.default, { prefix: "/api/v1" });
    app.register(static_1.default, {
        root: path_1.default.join(__dirname, "../public"), // путь к твоей папке public
        prefix: "/", // префикс, который будет в URL
    });
    // health endoint
    app.get("/api/v1/health", async () => ({
        status: "ok",
        timestamp: new Date().toISOString(),
    }));
    return app;
}
