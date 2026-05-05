"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const caching_1 = __importDefault(require("@fastify/caching"));
exports.default = (0, fastify_plugin_1.default)(async (app) => {
    app.register(caching_1.default, {
        privacy: "public",
        expiresIn: 30,
    });
});
