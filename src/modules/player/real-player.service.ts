import fs from "fs";
import path from "path";
import { FastifyInstance } from "fastify";
import {
    Player,
    PlayerRole,
    PlayerStyle,
    Position,
} from "@prisma/client";
import { PLAYER_CLUBS } from "../../config/constants";
import {
    assembleCardFromPlayerBuffer,
    PlayerCardData,
} from "./playerImage.together";

const TEMPLATES_PATH = path.resolve("./data/real-players.json");

export interface RealPlayerTemplate {
    id: string;
    name: string;
    surname: string;
    ovr: number;
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
    goalkeeping?: number;
    avatar_path: string;
    weight: number;
    weakFoot: number;
    foot: string;
    club: string;
    country: string;
    position: Position;
    age: number;
}

export interface RealPlayerTemplateView extends RealPlayerTemplate {
    released: boolean;
    releasedPlayerId?: string;
    status?: "free_agent" | "assigned";
}

function resolveClubId(clubName: string): number {
    const index = PLAYER_CLUBS.findIndex(
        (club) => club.toLowerCase() === clubName.toLowerCase(),
    );
    return index >= 0 ? index + 1 : 0;
}

function resolveRole(position: Position): PlayerRole {
    if (position === "GK") return PlayerRole.GOALKEEPER;
    if (["CB", "LB", "RB"].includes(position)) return PlayerRole.DEFENDER;
    if (["CDM", "CM", "CAM"].includes(position)) return PlayerRole.MIDFIELDER;
    return PlayerRole.FORWARD;
}

function resolveStyle(template: RealPlayerTemplate): PlayerStyle {
    const stats = [
        { style: PlayerStyle.SPEEDY, value: template.pace },
        { style: PlayerStyle.POWERFUL, value: template.physical },
        { style: PlayerStyle.TECHNICAL, value: template.dribbling },
        { style: PlayerStyle.ATTACKING, value: template.shooting },
        { style: PlayerStyle.DEFENSIVE, value: template.defending },
    ];
    stats.sort((a, b) => b.value - a.value);
    return stats[0].style;
}

function resolveRarity(ovr: number): string {
    if (ovr >= 75) return "gold";
    if (ovr >= 65) return "silver";
    return "bronze";
}

export function loadRealPlayerTemplates(): RealPlayerTemplate[] {
    if (!fs.existsSync(TEMPLATES_PATH)) {
        throw new Error(`Real players template file not found: ${TEMPLATES_PATH}`);
    }
    const raw = fs.readFileSync(TEMPLATES_PATH, "utf-8");
    return JSON.parse(raw) as RealPlayerTemplate[];
}

export function getRealPlayerTemplate(templateId: string): RealPlayerTemplate {
    const template = loadRealPlayerTemplates().find((item) => item.id === templateId);
    if (!template) {
        throw new Error(`Real player template not found: ${templateId}`);
    }
    return template;
}

async function buildPlayerCardImage(
    template: RealPlayerTemplate,
): Promise<string> {
    const clubId = resolveClubId(template.club);
    const cardData: PlayerCardData = {
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
        face: template.avatar_path,
    };

    const safeName = `real_${template.id}`.toLowerCase().replace(/[^a-z0-9_]+/g, "_");
    const fileName = `${safeName}_${Date.now()}`;
    return (
        (await assembleCardFromPlayerBuffer(
            cardData,
            resolveRarity(template.ovr),
            fileName,
        )) || template.avatar_path
    );
}

export async function releaseRealPlayer(
    app: FastifyInstance,
    templateId: string,
): Promise<Player> {
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
        throw new Error(
            `Template "${template.name} ${template.surname}" is already released as a free agent`,
        );
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

export async function listRealPlayerTemplates(
    app: FastifyInstance,
): Promise<RealPlayerTemplateView[]> {
    const templates = loadRealPlayerTemplates();
    const released = await app.prisma.player.findMany({
        where: { isRealPlayer: true, realPlayerTemplateId: { not: null } },
        include: { teamPlayers: true },
    });

    const releasedByTemplate = new Map(
        released
            .filter((player) => player.realPlayerTemplateId)
            .map((player) => [player.realPlayerTemplateId!, player]),
    );

    return templates.map((template) => {
        const player = releasedByTemplate.get(template.id);
        const isFreeAgent =
            !!player && player.ownerId === null && player.teamPlayers.length === 0;

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

export async function listReleasedRealPlayers(app: FastifyInstance) {
    const players = await app.prisma.player.findMany({
        where: { isRealPlayer: true },
        include: { teamPlayers: { include: { team: true } } },
        orderBy: { createdAt: "desc" },
    });

    return players.map((player) => ({
        ...player,
        status:
            player.ownerId === null && player.teamPlayers.length === 0
                ? "free_agent"
                : "assigned",
    }));
}
