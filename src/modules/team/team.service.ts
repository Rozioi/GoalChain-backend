import { FastifyInstance } from "fastify";
import {
    calculatePublicRating,
    calculateTeamRating,
    calculateTeamSynergy,
} from "../player/synergy.engine";

export async function getMyTeam(app: FastifyInstance, userId: string) {
    const team = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
        include: {
            players: {
                include: { player: true },
                orderBy: [
                    { isStarter: "desc" },
                    { positionInFormation: "asc" },
                ],
            },
        },
    });

    if (!team) throw new Error("No team found. Complete the draft first.");

    const starters = team.players.filter((tp: any) => tp.isStarter);
    const reserves = team.players.filter((tp: any) => !tp.isStarter);
    const synergy = calculateTeamSynergy(
        starters.map((tp: any) => ({
            position: tp.player.position,
            role: tp.player.role,
            style: tp.player.style,
            overallRating: tp.player.overallRating,
        })),
    );

    const allPlayers = team.players.map((tp: any) => ({
        position: tp.player.position,
        role: tp.player.role,
        style: tp.player.style,
        overallRating: tp.player.overallRating,
    }));

    const publicOvr = calculatePublicRating(allPlayers);

    return {
        ...team,
        starters,
        reserves,
        synergy,
        ovr: team.rating,
        publicOvr,
    };
}

export async function updateLineup(
    app: FastifyInstance,
    userId: string,
    starterIds: string[],
    formation?: string,
) {
    const team = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
        include: { players: { include: { player: true } } },
    });

    if (!team) throw new Error("No team found");
    if (starterIds.length !== 11)
        throw new Error("Must have exactly 11 starters");

    const teamPlayerIds = team.players.map((tp: any) => tp.playerId);
    for (const id of starterIds) {
        if (!teamPlayerIds.includes(id)) {
            throw new Error(`Player ${id} is not on your team`);
        }
    }

    // Валидация: GK (позиция GOALKEEPER) только на позиции 1 (вратарь)
    // Позиция GK должна быть первой в starterIds
    const playersMap = new Map(
        team.players.map((tp: any) => [tp.playerId, tp.player]),
    );

    for (let i = 0; i < starterIds.length; i++) {
        const playerId = starterIds[i];
        const player = playersMap.get(playerId);
        if (!player) throw new Error(`Player ${playerId} not found in team`);

        const isGk =
            player.position === "GOALKEEPER" || player.role === "GOALKEEPER";
        const isGkSlot = i === 0;

        if (isGk && !isGkSlot) {
            throw new Error(
                "Goalkeeper can only be placed in the GK slot (first position)",
            );
        }
        if (isGkSlot && !isGk) {
            throw new Error("Only a Goalkeeper can be placed in the GK slot");
        }
    }

    await app.prisma.teamPlayer.updateMany({
        where: { teamId: team.id },
        data: { isStarter: false, positionInFormation: null },
    });

    for (let i = 0; i < starterIds.length; i++) {
        const playerId = starterIds[i];
        await app.prisma.teamPlayer.update({
            where: { teamId_playerId: { teamId: team.id, playerId } },
            data: {
                isStarter: true,
                positionInFormation: i.toString(),
            },
        });
    }

    if (formation) {
        await app.prisma.team.update({
            where: { id: team.id },
            data: { formation },
        });
    }

    const starterPlayers = await app.prisma.player.findMany({
        where: { id: { in: starterIds } },
    });
    const rating = calculateTeamRating(
        starterPlayers.map((p: any) => ({
            position: p.position,
            role: p.role,
            style: p.style,
            overallRating: p.overallRating,
        })),
    );

    await app.prisma.team.update({
        where: { id: team.id },
        data: { rating },
    });

    // Возвращаем обновлённую команду
    return await getMyTeam(app, userId);
}

export async function getTeamRating(app: FastifyInstance, userId: string) {
    const team = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
        include: {
            players: {
                where: { isStarter: true },
                include: { player: true },
            },
        },
    });

    if (!team) throw new Error("No team found");

    const starters = team.players.map((tp: any) => ({
        position: tp.player.position,
        role: tp.player.role,
        style: tp.player.style,
        overallRating: tp.player.overallRating,
    }));

    const rating = calculateTeamRating(starters);
    const synergy = calculateTeamSynergy(starters);

    return { rating, synergy, formation: team.formation };
}
