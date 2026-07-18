import { FastifyInstance } from "fastify";
import { Player, PlayerRole, DraftStep } from "@prisma/client";
import { generateMultiplePlayers, generatePlayer, GeneratedPlayer } from "../player/player.generator";
import { tryAcquireRealPlayerFromPool } from "../player/real-player.pool";
import {
    calculateTeamSynergy,
    calculateTeamRating,
} from "../player/synergy.engine";
import { DRAFT } from "../../config/constants";
import { AppError } from "../../utils/app-error";

// Default formation slot order for 4-4-2
const DEFAULT_FORMATION_SLOTS = [
    "st1", "st2", "lm", "cm1", "cm2", "rm", "lb", "cb1", "cb2", "rb", "gk",
];

const STEP_CONFIG: Record<
    string,
    { role: PlayerRole; count: number; picks: number; next: string }
> = {
    GK: { role: PlayerRole.GOALKEEPER, count: DRAFT.STARTER_GK_OPTIONS, picks: DRAFT.STARTER_GK_PICKS, next: "DEF" },
    DEF: { role: PlayerRole.DEFENDER, count: DRAFT.STARTER_DEF_OPTIONS, picks: DRAFT.STARTER_DEF_PICKS, next: "MID" },
    MID: { role: PlayerRole.MIDFIELDER, count: DRAFT.STARTER_MID_OPTIONS, picks: DRAFT.STARTER_MID_PICKS, next: "FWD" },
    FWD: { role: PlayerRole.FORWARD, count: DRAFT.STARTER_FWD_OPTIONS, picks: DRAFT.STARTER_FWD_PICKS, next: "DONE" },
};

export async function startDraft(app: FastifyInstance, userId: string) {
    const existingTeam = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
    });
    if (existingTeam) {
        throw new AppError("User already has a team", 409);
    }

    const existingDraft = await app.prisma.draftSession.findFirst({
        where: { userId, status: "IN_PROGRESS" },
    });
    if (existingDraft) {
        return existingDraft;
    }

    const session = await app.prisma.draftSession.create({
        data: { userId, step: "GK" as DraftStep },
    });
    return session;
}

export async function getDraftOptions(
    app: FastifyInstance,
    userId: string,
    step: string,
) {
    const session = await app.prisma.draftSession.findFirst({
        where: { userId, status: "IN_PROGRESS" },
        include: { options: { include: { player: true } } },
    });
    console.log(session);
    if (!session) {
        // If user already has a team, tell the client explicitly
        const existingTeam = await app.prisma.team.findFirst({
            where: { userId, isEvent: false },
        });
        if (existingTeam) {
            throw new AppError("User already has a team", 409);
        }
        throw new AppError("No active draft session", 404);
    }

    const stepUpper = step.toUpperCase();
    if (session.step !== stepUpper) {
        throw new AppError(
            `Current draft step is ${session.step}, not ${stepUpper}`,
            409,
        );
    }

    const existingOptions = session.options.filter(
        (o: any) => o.step === stepUpper && !o.isPicked,
    );
    if (existingOptions.length > 0) {
        return {
            session,
            options: existingOptions.map((o: any) => ({
                ...o.player,
                ovr: o.player.overallRating,
                optionId: o.id,
            })),
            config: STEP_CONFIG[stepUpper],
        };
    }

    const config = STEP_CONFIG[stepUpper];
    if (!config) throw new AppError(`Invalid draft step: ${stepUpper}`, 400);

    const realPlayer = await tryAcquireRealPlayerFromPool(
        app,
        userId,
        config.role,
        DRAFT.STARTER_OVR_MIN,
        DRAFT.STARTER_OVR_MAX,
    );
    const generatedPlayers = await generateMultiplePlayers(
        realPlayer ? config.count - 1 : config.count,
        {
            role: config.role,
            ovrMin: DRAFT.STARTER_OVR_MIN,
            ovrMax: DRAFT.STARTER_OVR_MAX,
            seed: `draft-${session.id}-${stepUpper}`,
        },
    );

    const options = await app.prisma.$transaction(async (tx) => {
        const createdOptions = [];
        const playersToLink = [];

        if (realPlayer) {
            playersToLink.push(realPlayer);
        }

        for (const gp of generatedPlayers) {
            const player = await tx.player.create({
                data: { ...gp, ownerId: userId },
            });
            playersToLink.push(player);
        }

        for (const player of playersToLink) {
            const option = await tx.draftOption.create({
                data: {
                    draftSessionId: session.id,
                    playerId: player.id,
                    step: stepUpper as DraftStep,
                },
            });
            createdOptions.push({
                ...player,
                ovr: player.overallRating,
                optionId: option.id,
            });
        }
        return createdOptions;
    });

    const updatedSession = await app.prisma.draftSession.findUnique({
        where: { id: session.id },
        include: { options: { include: { player: true } } },
    });

    const pickedOptions = (updatedSession?.options || []).filter(
        (o: any) => o.isPicked,
    );
    const pickedPlayers = pickedOptions.map((o: any) => o.player);

    const suggestions = options.map((opt: any) => {
        const testTeam = [
            ...pickedPlayers.map((p: any) => ({
                position: p.position,
                role: p.role,
                style: p.style,
                overallRating: p.overallRating,
            })),
            {
                position: opt.position,
                role: opt.role,
                style: opt.style,
                overallRating: opt.overallRating,
            },
        ];
        const synergy = calculateTeamSynergy(testTeam);
        return {
            ...opt,
            ovr: opt.overallRating,
            synergy: synergy.totalBonus,
            synergyDetails: synergy.details,
        };
    });

    return { session: updatedSession, options: suggestions, config };
}

export async function pickDraftPlayers(
    app: FastifyInstance,
    userId: string,
    optionIds: string[],
) {
    const session = await app.prisma.draftSession.findFirst({
        where: { userId, status: "IN_PROGRESS" },
        include: { options: { include: { player: true } } },
    });
    if (!session) throw new AppError("No active draft session", 404);

    const currentStep = session.step;
    const config = STEP_CONFIG[currentStep];
    if (!config) throw new AppError(`Invalid draft step: ${currentStep}`, 400);

    // Проверяем, что опции существуют, не выбраны и относятся к текущему шагу
    const optionsToPick = await app.prisma.draftOption.findMany({
        where: {
            id: { in: optionIds },
            draftSessionId: session.id,
            step: currentStep as DraftStep,
            isPicked: false,
        },
    });

    if (optionsToPick.length === 0) {
        throw new AppError("No valid options found to pick");
    }

    // Помечаем выбранные опции
    await app.prisma.draftOption.updateMany({
        where: {
            id: { in: optionsToPick.map((o) => o.id) },
        },
        data: { isPicked: true },
    });

    // Считаем, сколько уже выбрано на текущем шаге
    const pickedCount = await app.prisma.draftOption.count({
        where: {
            draftSessionId: session.id,
            step: currentStep as DraftStep,
            isPicked: true,
        },
    });

    // Если выбрано достаточно — переходим на следующий шаг
    if (pickedCount >= config.picks && config.next !== "DONE") {
        await app.prisma.draftSession.update({
            where: { id: session.id },
            data: { step: config.next as DraftStep },
        });
    }

    // Определяем, был ли переход на следующий шаг
    const freshSession = await app.prisma.draftSession.findUnique({
        where: { id: session.id },
        include: { options: { include: { player: true } } },
    });

    const nextStep = pickedCount >= config.picks
        ? config.next
        : currentStep;

    return {
        success: true,
        nextStep,
        session: freshSession,
    };
}

export async function completeDraft(
    app: FastifyInstance,
    userId: string,
    clubName?: string,
) {
    try {
        const session = await app.prisma.draftSession.findFirst({
            where: { userId, status: "IN_PROGRESS" },
            include: { options: { include: { player: true } } },
        });

        if (!session) throw new AppError("No active draft session", 404);

        const starters = session.options
            .filter((o: any) => o.isPicked)
            .map((o: any) => o.player)
            .filter(Boolean);

        if (starters.length < 11) {
            throw new AppError(
                `Draft is not finished yet. You must pick 11 starters (have ${starters.length})`,
                400,
            );
        }

        const user = await app.prisma.user.findUnique({
            where: { id: userId },
        });

        // ── 1. Тяжёлая работа ДО транзакции: генерация резервистов ──
        const reserveSlots: PlayerRole[] = [
            ...Array.from({ length: DRAFT.RESERVE_GK }, () => "GOALKEEPER" as PlayerRole),
            ...Array.from({ length: DRAFT.RESERVE_DEF }, () => "DEFENDER" as PlayerRole),
            ...Array.from({ length: DRAFT.RESERVE_MID }, () => "MIDFIELDER" as PlayerRole),
            ...Array.from({ length: DRAFT.RESERVE_FWD }, () => "FORWARD" as PlayerRole),
        ];

        // Пытаемся подобрать одного реального игрока из пула
        let realReservePlayer: Player | null = null;
        for (const role of reserveSlots) {
            const rp = await tryAcquireRealPlayerFromPool(
                app, userId, role,
                DRAFT.RESERVE_OVR_MIN,
                DRAFT.RESERVE_OVR_MAX,
            );
            if (rp) {
                realReservePlayer = rp;
                break;
            }
        }

        // Генерируем всех резервистов (sharp, fetch, ipfs — ДО транзакции)
        const reserveToCreate: Array<Player | GeneratedPlayer> = [];
        let realPlaced = false;
        for (let i = 0; i < reserveSlots.length; i++) {
            if (!realPlaced && realReservePlayer) {
                realPlaced = true;
                reserveToCreate.push(realReservePlayer);
            } else {
                const generated = await generatePlayer({
                    role: reserveSlots[i],
                    ovrMin: DRAFT.RESERVE_OVR_MIN,
                    ovrMax: DRAFT.RESERVE_OVR_MAX,
                    seed: `reserve-${session.id}-${reserveSlots[i]}-${i}`,
                });
                reserveToCreate.push(generated);
            }
        }

        // ── 2. Быстрая транзакция: только запись в БД ──
        const teamResult = await app.prisma.$transaction(async (tx) => {
            const cleanClubName = clubName?.trim();
            const team = await tx.team.create({
                data: {
                    name: cleanClubName || `${user?.clubName || "Player"}`,
                    userId,
                },
            });

            // Стартёры (уже в БД — picked на предыдущих шагах)
            const fwds = starters.filter((p: any) => p && p.role === "FORWARD");
            const mids = starters.filter((p: any) => p && p.role === "MIDFIELDER");
            const defs = starters.filter((p: any) => p && p.role === "DEFENDER");
            const gks = starters.filter((p: any) => p && p.role === "GOALKEEPER");
            const sortedStarters = [...fwds, ...mids, ...defs, ...gks];

            for (let i = 0; i < sortedStarters.length; i++) {
                const player = sortedStarters[i];
                if (!player || !player.id) {
                    app.log.warn({ i, player, teamId: team.id }, "completeDraft: skipping invalid starter");
                    continue;
                }
                const slotKey = DEFAULT_FORMATION_SLOTS[i] || `slot-${i}`;
                await tx.teamPlayer.create({
                    data: {
                        teamId: team.id,
                        playerId: player.id,
                        isStarter: true,
                        positionInFormation: slotKey,
                    },
                });
            }

            // Резервисты
            for (const item of reserveToCreate) {
                let playerId: string;
                if ("id" in item) {
                    // Реальный игрок из пула — уже есть в БД
                    playerId = (item as Player).id;
                } else {
                    // Сгенерированный — создаём запись
                    const created = await tx.player.create({
                        data: { ...(item as GeneratedPlayer), ownerId: userId },
                    });
                    playerId = created.id;
                }
                await tx.teamPlayer.create({
                    data: {
                        teamId: team.id,
                        playerId,
                        isStarter: false,
                    },
                });
            }

            const rating = calculateTeamRating(
                starters.map((p: any) => ({
                    position: p.position,
                    role: p.role,
                    style: p.style,
                    overallRating: p.overallRating,
                })),
            );

            await tx.team.update({ where: { id: team.id }, data: { rating } });

            await tx.draftSession.update({
                where: { id: session.id },
                data: {
                    status: "COMPLETED",
                    step: "DONE" as DraftStep,
                    teamId: team.id,
                },
            });

            return {
                teamId: team.id,
                teamName: team.name,
                rating,
                startersCount: starters.length,
                reservesCount: reserveToCreate.length,
            };
        });

        return {
            team: {
                id: teamResult.teamId,
                name: teamResult.teamName,
                rating: teamResult.rating,
                starters: teamResult.startersCount,
                reserves: teamResult.reservesCount,
                total: teamResult.startersCount + teamResult.reservesCount,
            },
        };
    } catch (err: any) {
        app.log.error({ err, userId }, "completeDraft failed");
        if (err instanceof AppError) throw err;
        throw new AppError(err?.message || "Failed to complete draft", 500);
    }
}
