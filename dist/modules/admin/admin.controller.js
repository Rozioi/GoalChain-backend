"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminController = void 0;
const adminService = __importStar(require("./admin.service"));
exports.adminController = {
    stats: async (request, reply) => {
        const stats = await adminService.getGlobalStats(request.server);
        return reply.send(stats);
    },
    listUsers: async (request, reply) => {
        const { search, skip, take } = request.query;
        const result = await adminService.listUsers(request.server, {
            search,
            skip: skip ? parseInt(skip) : undefined,
            take: take ? parseInt(take) : undefined,
        });
        return reply.send(result);
    },
    updateUser: async (request, reply) => {
        const user = await adminService.updateUser(request.server, request.params.id, request.body);
        return reply.send(user);
    },
    createSeason: async (request, reply) => {
        const season = await adminService.createSeason(request.server, {
            ...request.body,
            startDate: new Date(request.body.startDate),
            endDate: new Date(request.body.endDate),
        });
        return reply.status(201).send(season);
    },
    updateSeason: async (request, reply) => {
        const season = await adminService.updateSeasonStatus(request.server, request.params.id, request.body.status);
        return reply.send(season);
    },
    listSeasons: async (request, reply) => {
        const seasons = await adminService.listSeasons(request.server);
        return reply.send(seasons);
    },
    endSeason: async (request, reply) => {
        const result = await adminService.endSeason(request.server, request.params.id);
        return reply.send(result);
    },
    broadcast: async (request, reply) => {
        try {
            const result = await adminService.broadcastMessage(request.server, request.body.text, request.body.photoBase64);
            return reply.send(result);
        }
        catch (err) {
            return reply.status(400).send({ error: err.message });
        }
    },
};
