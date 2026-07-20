import { FastifyInstance } from "fastify";
import {
    calculatePublicRating,
    calculateTeamRating,
    calculateSquadRating,
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
    starters: { playerId: string; slotKey: string }[],
    formation?: string,
) {
    const team = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
        include: { players: { include: { player: true } } },
    });

    if (!team) throw new Error("No team found");
    if (starters.length !== 11)
        throw new Error("Must have exactly 11 starters");

    const teamPlayerIds = team.players.map((tp: any) => tp.playerId);
    for (const s of starters) {
        if (!teamPlayerIds.includes(s.playerId)) {
            throw new Error(`Player ${s.playerId} is not on your team`);
        }
    }

    // Валидация: ровно один GK в стартовом составе
    let gkCount = 0;
    for (const s of starters) {
        if (s.slotKey === "gk") gkCount++;
    }
    if (gkCount !== 1) {
        throw new Error(
            "Team must have exactly one Goalkeeper in the starting lineup",
        );
    }

    await app.prisma.teamPlayer.updateMany({
        where: { teamId: team.id },
        data: { isStarter: false, positionInFormation: null },
    });

    for (const s of starters) {
        await app.prisma.teamPlayer.update({
            where: { teamId_playerId: { teamId: team.id, playerId: s.playerId } },
            data: {
                isStarter: true,
                positionInFormation: s.slotKey,
            },
        });
    }

    if (formation) {
        await app.prisma.team.update({
            where: { id: team.id },
            data: { formation },
        });
    }

    // Считаем средний OVR всего состава (старт + резерв)
    const allPlayers = await app.prisma.player.findMany({
        where: { id: { in: team.players.map((tp: any) => tp.playerId) } },
    });
    const rating = calculateSquadRating(
        allPlayers.map((p: any) => ({
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

    return await getMyTeam(app, userId);
}

export async function substitutePlayer(
    app: FastifyInstance,
    userId: string,
    outPlayerId: string,
    inPlayerId: string,
    slotKey: string,
) {
    const team = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
        include: { players: { include: { player: true } } },
    });

    if (!team) throw new Error("No team found");

    const outTP = team.players.find((tp: any) => tp.playerId === outPlayerId);
    const inTP = team.players.find((tp: any) => tp.playerId === inPlayerId);

    if (!outTP) throw new Error("Player to substitute out not found in team");
    if (!inTP) throw new Error("Player to substitute in not found in team");
    if (!outTP.isStarter) throw new Error("Player to substitute out is not a starter");
    if (inTP.isStarter) throw new Error("Player to substitute in is already a starter");

    // Swap: out → bench, in → starter with the slotKey
    await app.prisma.teamPlayer.update({
        where: { teamId_playerId: { teamId: team.id, playerId: outPlayerId } },
        data: { isStarter: false, positionInFormation: null },
    });

    await app.prisma.teamPlayer.update({
        where: { teamId_playerId: { teamId: team.id, playerId: inPlayerId } },
        data: { isStarter: true, positionInFormation: slotKey },
    });

    // Recalc team rating (весь состав)
    const allTeamPlayers = await app.prisma.teamPlayer.findMany({
        where: { teamId: team.id },
        include: { player: true },
    });

    const rating = calculateSquadRating(
        allTeamPlayers.map((tp: any) => ({
            position: tp.player.position,
            role: tp.player.role,
            style: tp.player.style,
            overallRating: tp.player.overallRating,
        })),
    );

    await app.prisma.team.update({
        where: { id: team.id },
        data: { rating },
    });

    return await getMyTeam(app, userId);
}

export async function getTeamRating(app: FastifyInstance, userId: string) {
    const team = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
        include: {
            players: {
                include: { player: true },
            },
        },
    });

    if (!team) throw new Error("No team found");

    // Стартовый состав — для синергии
    const starters = team.players
        .filter((tp: any) => tp.isStarter)
        .map((tp: any) => ({
            position: tp.player.position,
            role: tp.player.role,
            style: tp.player.style,
            overallRating: tp.player.overallRating,
        }));

    // Весь состав — для общего рейтинга
    const allPlayers = team.players.map((tp: any) => ({
        position: tp.player.position,
        role: tp.player.role,
        style: tp.player.style,
        overallRating: tp.player.overallRating,
    }));

    const rating = calculateSquadRating(allPlayers);
    const synergy = calculateTeamSynergy(starters);

    return { rating, synergy, formation: team.formation };
}
