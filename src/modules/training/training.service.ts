import { FastifyInstance } from "fastify";
import { TRAINING } from "../../config/constants";
import { calculateTeamRating } from "../player/synergy.engine";

export async function startTraining(
    app: FastifyInstance,
    userId: string,
    playerId: string,
    stat: string,
) {
    const validStats = [
        "pace", "shooting", "passing", "dribbling", "defending", "physical",
    ];
    if (!validStats.includes(stat)) {
        throw new Error(`Invalid stat: ${stat}. Must be one of: ${validStats.join(", ")}`);
    }

    // Check player belongs to user's team
    const teamPlayer = await app.prisma.teamPlayer.findFirst({
        where: {
            player: { id: playerId },
            team: { userId, isEvent: false },
        },
        include: { player: true },
    });

    if (!teamPlayer) throw new Error("Player not on your team");

    // Check cooldown
    const lastTraining = await app.prisma.training.findFirst({
        where: { userId, playerId, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
    });

    if (lastTraining) {
        const cooldownEnd = new Date(
            lastTraining.createdAt.getTime() + TRAINING.COOLDOWN_MS,
        );
        if (new Date() < cooldownEnd) {
            throw new Error(
                `Training on cooldown. Available at ${cooldownEnd.toISOString()}`,
            );
        }
    }

    // Check max OVR
    const maxOvr = teamPlayer.player.isNft
        ? TRAINING.MAX_OVR_NFT
        : TRAINING.MAX_OVR_NORMAL;

    const currentStatValue = (teamPlayer.player as any)[stat] as number;
    if (currentStatValue >= maxOvr) {
        throw new Error(`${stat} is already at maximum (${maxOvr})`);
    }

    // Calculate cost
    const trainingCount = await app.prisma.training.count({
        where: { userId, playerId },
    });
    const cost = Math.floor(
        TRAINING.BASE_COST * Math.pow(TRAINING.COST_MULTIPLIER, trainingCount),
    );

    // Check coins
    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.coins < cost) {
        throw new Error(`Not enough coins. Need ${cost}, have ${user?.coins || 0}`);
    }

    const boost = teamPlayer.player.isNft
        ? TRAINING.BOOST_NFT
        : TRAINING.BOOST_NORMAL;

    const endsAt = new Date(Date.now() + TRAINING.COOLDOWN_MS);

    // Execute training
    const [training] = await app.prisma.$transaction([
        app.prisma.training.create({
            data: {
                userId,
                playerId,
                stat,
                boost,
                cost,
                status: "COMPLETED",
                endsAt,
            },
        }),
        app.prisma.user.update({
            where: { id: userId },
            data: { coins: { decrement: cost } },
        }),
        app.prisma.player.update({
            where: { id: playerId },
            data: {
                [stat]: { increment: boost },
                ovr: {
                    increment: Math.round(boost / 6), // OVR grows slower
                },
            },
        }),
    ]);

    // Recalculate team rating if the player is a starter
    if (teamPlayer.isStarter) {
        const team = await app.prisma.team.findUnique({
            where: { id: teamPlayer.teamId },
            include: {
                players: {
                    where: { isStarter: true },
                    include: { player: true },
                },
            },
        });

        if (team) {
            const starters = team.players.map((tp: any) => ({
                position: tp.player.position,
                role: tp.player.role,
                style: tp.player.style,
                ovr: tp.player.ovr,
            }));
            const rating = calculateTeamRating(starters);
            await app.prisma.team.update({
                where: { id: team.id },
                data: { rating },
            });
        }
    }

    return {
        training,
        stat,
        boost,
        cost,
        newStatValue: currentStatValue + boost,
    };
}

export async function getTrainingCost(
    app: FastifyInstance,
    userId: string,
    playerId: string,
) {
    const trainingCount = await app.prisma.training.count({
        where: { userId, playerId },
    });
    const cost = Math.floor(
        TRAINING.BASE_COST * Math.pow(TRAINING.COST_MULTIPLIER, trainingCount),
    );

    const teamPlayer = await app.prisma.teamPlayer.findFirst({
        where: {
            player: { id: playerId },
            team: { userId, isEvent: false },
        },
        include: { player: true },
    });

    const maxOvr = teamPlayer?.player.isNft
        ? TRAINING.MAX_OVR_NFT
        : TRAINING.MAX_OVR_NORMAL;

    // Check last training for cooldown
    const lastTraining = await app.prisma.training.findFirst({
        where: { userId, playerId, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
    });

    let cooldownEndsAt: Date | null = null;
    if (lastTraining) {
        const potentialEnd = new Date(lastTraining.createdAt.getTime() + TRAINING.COOLDOWN_MS);
        if (new Date() < potentialEnd) {
            cooldownEndsAt = potentialEnd;
        }
    }

    return {
        cost,
        totalTrainings: trainingCount,
        maxOvr,
        currentOvr: teamPlayer?.player.ovr || 0,
        isNft: teamPlayer?.player.isNft || false,
        cooldownEndsAt,
    };
}
