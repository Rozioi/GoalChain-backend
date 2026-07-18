"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadRealPlayerTemplates = loadRealPlayerTemplates;
exports.getRealPlayerTemplate = getRealPlayerTemplate;
exports.releaseRealPlayer = releaseRealPlayer;
exports.listRealPlayerTemplates = listRealPlayerTemplates;
exports.listReleasedRealPlayers = listReleasedRealPlayers;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const client_1 = require("@prisma/client");
const constants_1 = require("../../config/constants");
const playerImage_together_1 = require("./playerImage.together");
const player_avatar_1 = require("./player.avatar");
const TEMPLATES_PATH = path_1.default.resolve("./data/real-players.json");
function resolveClubId(clubName) {
    const index = constants_1.PLAYER_CLUBS.findIndex((club) => club.toLowerCase() === clubName.toLowerCase());
    return index >= 0 ? index + 1 : 0;
}
function resolveRole(position) {
    if (position === "GK")
        return client_1.PlayerRole.GOALKEEPER;
    if (["CB", "LB", "RB"].includes(position))
        return client_1.PlayerRole.DEFENDER;
    if (["CDM", "CM", "CAM"].includes(position))
        return client_1.PlayerRole.MIDFIELDER;
    return client_1.PlayerRole.FORWARD;
}
function resolveStyle(template) {
    const stats = [
        { style: client_1.PlayerStyle.SPEEDY, value: template.pace },
        { style: client_1.PlayerStyle.POWERFUL, value: template.physical },
        { style: client_1.PlayerStyle.TECHNICAL, value: template.dribbling },
        { style: client_1.PlayerStyle.ATTACKING, value: template.shooting },
        { style: client_1.PlayerStyle.DEFENSIVE, value: template.defending },
    ];
    stats.sort((a, b) => b.value - a.value);
    return stats[0].style;
}
function resolveRarity(ovr) {
    if (ovr >= 75)
        return "gold";
    if (ovr >= 65)
        return "silver";
    return "bronze";
}
function loadRealPlayerTemplates() {
    if (!fs_1.default.existsSync(TEMPLATES_PATH)) {
        throw new Error(`Real players template file not found: ${TEMPLATES_PATH}`);
    }
    const raw = fs_1.default.readFileSync(TEMPLATES_PATH, "utf-8");
    return JSON.parse(raw);
}
function getRealPlayerTemplate(templateId) {
    const template = loadRealPlayerTemplates().find((item) => item.id === templateId);
    if (!template) {
        throw new Error(`Real player template not found: ${templateId}`);
    }
    return template;
}
async function buildPlayerCardImage(template) {
    const avatarBuffer = await (0, player_avatar_1.loadAvatarBufferWithFallback)(template.avatar_path);
    const clubId = resolveClubId(template.club);
    const cardData = {
        name: template.name,
        surname: template.surname,
        nationality: template.country,
        club: template.club,
        clubId,
        overallRating: template.ovr,
        position: template.position,
        pace: template.pace,
        shooting: template.shooting,
        passing: template.passing,
        dribbling: template.dribbling,
        defending: template.defending,
        physical: template.physical,
    };
    const fileName = `real_${template.id}`.toLowerCase().replace(/[^a-z0-9_]+/g, "_");
    return ((await (0, playerImage_together_1.assembleCardFromPlayerBuffer)(avatarBuffer, cardData, resolveRarity(template.ovr), fileName)) || template.avatar_path);
}
async function releaseRealPlayer(app, templateId) {
    const template = getRealPlayerTemplate(templateId);
    const existingFree = await app.prisma.player.findFirst({
        where: {
            realPlayerTemplateId: templateId,
            isRealPlayer: true,
            ownerId: null,
            teamPlayers: { none: {} },
        },
    });
    if (existingFree) {
        throw new Error(`Template "${template.name} ${template.surname}" is already released as a free agent`);
    }
    const imageUrl = await buildPlayerCardImage(template);
    const role = resolveRole(template.position);
    const style = resolveStyle(template);
    return app.prisma.player.create({
        data: {
            name: template.name,
            surname: template.surname,
            overallRating: template.ovr,
            position: template.position,
            role,
            style,
            pace: template.pace,
            shooting: template.shooting,
            passing: template.passing,
            dribbling: template.dribbling,
            defending: template.defending,
            physical: template.physical,
            goalkeeping: template.goalkeeping ?? 10,
            potentialMin: template.ovr,
            potentialMax: Math.min(99, template.ovr + 3),
            heightCm: 180,
            weightKg: template.weight,
            foot: template.foot,
            skillMoves: template.ovr >= 85 ? 5 : 4,
            weakFoot: template.weakFoot,
            country: template.country,
            nationality: template.country,
            club: template.club,
            clubId: resolveClubId(template.club),
            age: template.age,
            formValue: 1,
            face: template.avatar_path,
            imageUrl,
            rarity: resolveRarity(template.ovr),
            isRealPlayer: true,
            realPlayerTemplateId: templateId,
            ownerId: null,
        },
    });
}
async function listRealPlayerTemplates(app) {
    const templates = loadRealPlayerTemplates();
    const released = await app.prisma.player.findMany({
        where: { isRealPlayer: true, realPlayerTemplateId: { not: null } },
        include: { teamPlayers: true },
    });
    const releasedByTemplate = new Map(released
        .filter((player) => player.realPlayerTemplateId)
        .map((player) => [player.realPlayerTemplateId, player]));
    return templates.map((template) => {
        const player = releasedByTemplate.get(template.id);
        const isFreeAgent = !!player && player.ownerId === null && player.teamPlayers.length === 0;
        return {
            ...template,
            released: !!player,
            releasedPlayerId: player?.id,
            status: !player
                ? undefined
                : isFreeAgent
                    ? "free_agent"
                    : "assigned",
        };
    });
}
async function listReleasedRealPlayers(app) {
    const players = await app.prisma.player.findMany({
        where: { isRealPlayer: true },
        include: { teamPlayers: { include: { team: true } } },
        orderBy: { createdAt: "desc" },
    });
    return players.map((player) => ({
        ...player,
        status: player.ownerId === null && player.teamPlayers.length === 0
            ? "free_agent"
            : "assigned",
    }));
}
