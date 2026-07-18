import { FastifyInstance } from "fastify";
import { Player, PlayerRole } from "@prisma/client";
import { REAL_PLAYER } from "../../config/constants";

export async function getAvailableRealPlayers(
    app: FastifyInstance,
    role?: PlayerRole,
    ovrMin?: number,
    ovrMax?: number,
): Promise<Player[]> {
    return app.prisma.player.findMany({
        where: {
            isRealPlayer: true,
            ownerId: null,
            teamPlayers: { none: {} },
            ...(role ? { role } : {}),
            ...(ovrMin !== undefined ? { overallRating: { gte: ovrMin } } : {}),
            ...(ovrMax !== undefined ? { overallRating: { lte: ovrMax } } : {}),
        },
    });
}

export async function tryAcquireRealPlayerFromPool(
    app: FastifyInstance,
    userId: string,
    role?: PlayerRole,
    ovrMin?: number,
    ovrMax?: number,
): Promise<Player | null> {
    if (Math.random() > REAL_PLAYER.DROP_CHANCE) {
        return null;
    }

    const available = await getAvailableRealPlayers(app, role, ovrMin, ovrMax);
    if (available.length === 0) {
        return null;
    }

    const picked = available[Math.floor(Math.random() * available.length)];

    return app.prisma.player.update({
        where: { id: picked.id },
        data: { ownerId: userId },
    });
}
