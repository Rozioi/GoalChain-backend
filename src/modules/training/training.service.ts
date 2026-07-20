import { FastifyInstance } from "fastify";
import { TRAINING } from "../../config/constants";
import {
    calculateSquadRating,
    calculatePlayerOverall,
} from "../player/synergy.engine";
import { regeneratePlayerCard } from "../player/playerImage.together";

class TrainingError extends Error {
    code: string;
    details?: Record<string, any>;

    constructor(message: string, code: string, details?: Record<string, any>) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = "TrainingError";
    }
}

export { TrainingError };

// Training complexes: each trains 2 stats
const TRAINING_COMPLEXES: Record<string, { stats: string[]; label: string }> = {
    PHYSICAL: { stats: ["pace", "physical"], label: "Физическая подготовка" },
    TECHNIQUE: { stats: ["passing", "dribbling"], label: "Техника" },
    ATTACK: { stats: ["shooting", "dribbling"], label: "Завершение атак" },
    DEFENSE: { stats: ["defending", "physical"], label: "Оборона" },
};

const COMPLEX_IDS = Object.keys(TRAINING_COMPLEXES); // ["PHYSICAL", "TECHNIQUE", "ATTACK", "DEFENSE"]

function pickRandomComplexes(count: number): string[] {
    const shuffled = [...COMPLEX_IDS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

export async function getRandomComplexes(): Promise<string[]> {
    return pickRandomComplexes(2);
}

export async function startTraining(
    app: FastifyInstance,
    userId: string,
    playerId: string,
    complexId: string,
) {
    const complex = TRAINING_COMPLEXES[complexId];
    if (!complex) {
        throw new Error(
            `Invalid complex: ${complexId}. Must be one of: ${COMPLEX_IDS.join(", ")}`,
        );
    }

    const [stat1, stat2] = complex.stats;

    const teamPlayer = await app.prisma.teamPlayer.findFirst({
        where: {
            player: { id: playerId },
            team: { userId, isEvent: false },
        },
        include: { player: true },
    });

    if (!teamPlayer) {
        throw new TrainingError("Player not on your team", "NO_TEAM");
    }

    const playerWithRent = await app.prisma.player.findUnique({
        where: { id: playerId },
        include: { rent: true },
    });
    if (
        playerWithRent?.rent?.isRented &&
        playerWithRent.rent.rentedById !== userId
    ) {
        throw new TrainingError("Cannot train a rented out player", "RENTED_OUT");
    }

    if (
        teamPlayer.player.injuryEndsAt &&
        new Date() < new Date(teamPlayer.player.injuryEndsAt)
    ) {
        throw new TrainingError(
            "Player is traumatized",
            "TRAUMATIZED",
            { endsAt: teamPlayer.player.injuryEndsAt.toISOString() },
        );
    }

    const lastTraining = await app.prisma.training.findFirst({
        where: { userId, playerId, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
    });

    if (lastTraining) {
        const cooldownEnd = new Date(
            lastTraining.createdAt.getTime() + TRAINING.COOLDOWN_MS,
        );
        if (new Date() < cooldownEnd) {
            throw new TrainingError(
                "Training on cooldown",
                "COOLDOWN",
                { cooldownEndsAt: cooldownEnd.toISOString() },
            );
        }
    }

    const maxOvr = teamPlayer.player.potentialMax || 99;

    const currentOvr = teamPlayer.player.overallRating;
    if (currentOvr >= maxOvr) {
        throw new TrainingError(
            "Player reached max potential",
            "MAX_POTENTIAL",
            { maxOvr },
        );
    }

    const currentStatValue1 = (teamPlayer.player as any)[stat1] as number;
    const currentStatValue2 = (teamPlayer.player as any)[stat2] as number;
    if (currentStatValue1 >= maxOvr && currentStatValue2 >= maxOvr) {
        throw new TrainingError(
            `Both stats (${stat1}, ${stat2}) are already at maximum (${maxOvr})`,
            "STAT_MAXED",
            { stat1, stat2, maxOvr },
        );
    }

    const trainingCount = await app.prisma.training.count({
        where: { userId, playerId },
    });
    const cost = Math.floor(
        TRAINING.BASE_COST * Math.pow(TRAINING.COST_MULTIPLIER, trainingCount),
    );

    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.coins < cost) {
        throw new TrainingError(
            "Not enough coins",
            "INSUFFICIENT_FUNDS",
            { required: cost, balance: user?.coins || 0 },
        );
    }

    const boost = TRAINING.BOOST;
    const newVal1 = Math.min(maxOvr, currentStatValue1 + boost);
    const newVal2 = Math.min(maxOvr, currentStatValue2 + boost);
    const updatedStats = {
        ...teamPlayer.player,
        [stat1]: newVal1,
        [stat2]: newVal2,
    };
    const newOvr = Math.min(maxOvr, calculatePlayerOverall(updatedStats));
    const newXp =
        (teamPlayer.player.trainingExperience || 0) + TRAINING.XP_PER_TRAINING;
    const neededXp =
        teamPlayer.player.trainingExperienceRequired || TRAINING.XP_PER_LEVEL;
    let newLevel = teamPlayer.player.trainingLevel || 1;
    let newExp = newXp;
    let newNeededXp = neededXp;

    if (newExp >= newNeededXp) {
        newExp -= newNeededXp;
        newLevel += 1;
        newNeededXp = newLevel * TRAINING.XP_PER_LEVEL;
    }

    const endsAt = new Date(Date.now() + TRAINING.COOLDOWN_MS);

    const [training] = await app.prisma.$transaction([
        app.prisma.training.create({
            data: {
                userId,
                playerId,
                stat: complexId,
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
                [stat1]: newVal1,
                [stat2]: newVal2,
                overallRating: newOvr,
                trainingLevel: newLevel,
                trainingExperience: newExp,
                trainingExperienceRequired: newNeededXp,
            },
        }),
    ]);

    // Перегенерация карточки (после транзакции, чтобы не блокировать её)
    regeneratePlayerCard(playerId, app)
        .then((newImageUrl) => {
            if (newImageUrl) {
                app.prisma.player
                    .update({
                        where: { id: playerId },
                        data: { imageUrl: newImageUrl },
                    })
                    .catch((err) =>
                        app.log.error(err, "Failed to update player card"),
                    );
            }
        })
        .catch((err) => app.log.error(err, "Failed to regenerate player card"));

    if (teamPlayer.isStarter) {
        const team = await app.prisma.team.findUnique({
            where: { id: teamPlayer.teamId },
            include: {
                players: {
                    include: { player: true },
                },
            },
        });

        if (team) {
            const allTeamPlayers = team.players.map((tp: any) => ({
                position: tp.player.position,
                role: tp.player.role,
                style: tp.player.style,
                overallRating: tp.player.overallRating,
            }));
            const rating = calculateSquadRating(allTeamPlayers);
            await app.prisma.team.update({
                where: { id: team.id },
                data: { rating },
            });
        }
    }

    return {
        training,
        complexId,
        complexLabel: complex.label,
        stats: [stat1, stat2],
        boost,
        cost,
        newStatValues: { [stat1]: newVal1, [stat2]: newVal2 },
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

    const maxOvr = teamPlayer?.player.potentialMax || 99;

    const lastTraining = await app.prisma.training.findFirst({
        where: { userId, playerId, status: "COMPLETED" },
        orderBy: { createdAt: "desc" },
    });

    let cooldownEndsAt: Date | null = null;
    if (lastTraining) {
        const potentialEnd = new Date(
            lastTraining.createdAt.getTime() + TRAINING.COOLDOWN_MS,
        );
        if (new Date() < potentialEnd) {
            cooldownEndsAt = potentialEnd;
        }
    }

    return {
        cost,
        totalTrainings: trainingCount,
        maxOvr,
        currentOverallRating: teamPlayer?.player.overallRating || 0,
        currentOvr: teamPlayer?.player.overallRating || 0,
        potentialMin: teamPlayer?.player.potentialMin || 0,
        potentialMax: teamPlayer?.player.potentialMax || maxOvr,
        isNft: teamPlayer?.player.isNft || false,
        cooldownEndsAt,
        lastTrainedStat: lastTraining?.stat || null,
        lastTrainedStats: lastTraining?.stat
            ? (TRAINING_COMPLEXES[lastTraining.stat]?.stats || [])
            : [],
        trainingLevel: teamPlayer?.player.trainingLevel || 1,
        trainingLevelMax: TRAINING.MAX_TRAINING_LEVEL,
        trainingExperience: teamPlayer?.player.trainingExperience || 0,
        trainingExperienceRequired:
            teamPlayer?.player.trainingExperienceRequired ||
            TRAINING.XP_PER_LEVEL,
    };
}
