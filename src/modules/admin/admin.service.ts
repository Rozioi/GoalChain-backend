import { FastifyInstance } from "fastify";

export async function getGlobalStats(app: FastifyInstance) {
    const [userCount, teamCount, matchCount, totalCoins] = await Promise.all([
        app.prisma.user.count(),
        app.prisma.team.count(),
        app.prisma.match.count(),
        app.prisma.user.aggregate({ _sum: { coins: true } }),
    ]);

    return {
        users: userCount,
        teams: teamCount,
        matches: matchCount,
        economy: totalCoins._sum.coins || 0,
        timestamp: new Date().toISOString(),
    };
}

export async function listUsers(
    app: FastifyInstance,
    query: { search?: string; skip?: number; take?: number },
) {
    const { search, skip = 0, take = 50 } = query;

    const where = search
        ? {
              OR: [
                  {
                      username: {
                          contains: search,
                          mode: "insensitive" as any,
                      },
                  },
                  {
                      firstName: {
                          contains: search,
                          mode: "insensitive" as any,
                      },
                  },
                  { telegramId: { contains: search } },
              ],
          }
        : {};

    const [users, total] = await Promise.all([
        app.prisma.user.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: "desc" },
        }),
        app.prisma.user.count({ where }),
    ]);

    return { users, total };
}

export async function updateUser(
    app: FastifyInstance,
    userId: string,
    data: {
        coins?: number;
        points?: number;
        level?: number;
        username?: string;
        isAdmin?: boolean;
    },
) {
    return app.prisma.user.update({
        where: { id: userId },
        data,
    });
}

export async function createSeason(
    app: FastifyInstance,
    data: {
        name: string;
        startDate: Date;
        endDate: Date;
        division: number;
    },
) {
    return app.prisma.season.create({
        data: {
            ...data,
            status: "UPCOMING",
        },
    });
}

export async function updateSeasonStatus(
    app: FastifyInstance,
    seasonId: string,
    status: "UPCOMING" | "ACTIVE" | "PLAYOFFS" | "COMPLETED",
) {
    return app.prisma.season.update({
        where: { id: seasonId },
        data: { status },
    });
}

export async function listSeasons(app: FastifyInstance) {
    return app.prisma.season.findMany({
        orderBy: { createdAt: "desc" },
    });
}

import { endSeason as finishSeason } from "../season/season.service";
import { broadcastMessage } from "./broadcast.service";

export { broadcastMessage };

export async function endSeason(app: FastifyInstance, seasonId: string) {
    return finishSeason(app, seasonId);
}

export async function deleteUser(app: FastifyInstance, userId: string) {
    // Сначала удаляем зависимые сущности
    const teams = await app.prisma.team.findMany({
        where: { userId },
        select: { id: true },
    });
    const teamIds = teams.map((t) => t.id);

    await app.prisma.$transaction([
        app.prisma.user.delete({
            where: { id: userId },
        }),
    ]);

    return { success: true };
}

export async function deleteUserTeam(app: FastifyInstance, userId: string) {
    const teams = await app.prisma.team.findMany({
        where: { userId },
        select: { id: true },
    });
    const teamIds = teams.map((t) => t.id);

    await app.prisma.$transaction([
        app.prisma.teamPlayer.deleteMany({
            where: { teamId: { in: teamIds } },
        }),
        app.prisma.team.deleteMany({
            where: { userId },
        }),
    ]);

    return { success: true };
}
