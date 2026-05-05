"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const under_pressure_1 = __importDefault(require("@fastify/under-pressure"));
exports.default = (0, fastify_plugin_1.default)(async (app) => {
    app.register(under_pressure_1.default, { maxEventLoopDelay: 1000 });
});
