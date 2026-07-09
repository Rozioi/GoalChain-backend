import { FastifyInstance } from "fastify";
import { PlayerRole, DraftStep } from "@prisma/client";
import { generateMultiplePlayers } from "../player/player.generator";
import {
    calculateTeamSynergy,
    calculateTeamRating,
} from "../player/synergy.engine";
import { DRAFT } from "../../config/constants";

const STEP_CONFIG: Record<
    string,
    { role: PlayerRole; count: number; picks: number; next: DraftStep }
> = {
    GK: {
        role: "GOALKEEPER" as PlayerRole,
        count: DRAFT.STARTER_GK_OPTIONS,
        picks: DRAFT.STARTER_GK_PICKS,
        next: "DEF" as DraftStep,
    },
    DEF: {
        role: "DEFENDER" as PlayerRole,
        count: DRAFT.STARTER_DEF_OPTIONS,
        picks: DRAFT.STARTER_DEF_PICKS,
        next: "MID" as DraftStep,
    },
    MID: {
        role: "MIDFIELDER" as PlayerRole,
        count: DRAFT.STARTER_MID_OPTIONS,
        picks: DRAFT.STARTER_MID_PICKS,
        next: "FWD" as DraftStep,
    },
    FWD: {
        role: "FORWARD" as PlayerRole,
        count: DRAFT.STARTER_FWD_OPTIONS,
        picks: DRAFT.STARTER_FWD_PICKS,
        next: "RESERVE" as DraftStep,
    },
};

export async function startDraft(app: FastifyInstance, userId: string) {
    const existingTeam = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
    });
    if (existingTeam) {
        throw new AppError(
            "You already have a team. Draft is only for new users.",
            409,
        );
    }

    const existingDraft = await app.prisma.draftSession.findFirst({
        where: { userId, status: "IN_PROGRESS" },
    });
    if (existingDraft) {
        return existingDraft;
    }

    const session = await app.prisma.draftSession.create({
        data: { userId, step: "GK" },
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
    console.log("final step: ", config);
    const generatedPlayers = await generateMultiplePlayers(config.count, {
        role: config.role,
        ovrMin: DRAFT.STARTER_OVR_MIN,
        ovrMax: DRAFT.STARTER_OVR_MAX,
        seed: `draft-${session.id}-${stepUpper}`,
    });

    console.log(generatedPlayers);
    const options = await app.prisma.$transaction(async (tx) => {
        const createdOptions = [];
        for (const gp of generatedPlayers) {
            const player = await tx.player.create({
                data: { ...gp, ownerId: userId },
            });
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

    // Re-fetch session so session.options includes newly created options
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

import { AppError } from "../../utils/app-error";

export async function pickDraftPlayers(
    app: FastifyInstance,
    userId: string,
    optionIds: string[],
) {
    try {
        if (!Array.isArray(optionIds) || optionIds.length === 0) {
            throw new AppError("optionIds must be a non-empty array", 400);
        }
        if (optionIds.length > 20) {
            throw new AppError("Too many optionIds", 400);
        }

        const session = await app.prisma.draftSession.findFirst({
            where: { userId, status: "IN_PROGRESS" },
            include: { options: true },
        });

        if (!session) throw new AppError("No active draft session", 404);

        const currentStep = session.step;
        const config = STEP_CONFIG[currentStep];
        if (!config) throw new AppError("Draft is in reserve/done phase", 400);

        // Validate provided optionIds belong to this session
        let foundOptions = await app.prisma.draftOption.findMany({
            where: { id: { in: optionIds }, draftSessionId: session.id },
        });

        // Tolerant fallback: if client passed player IDs instead of draftOption IDs, try resolving
        if (foundOptions.length !== optionIds.length) {
            const alt = await app.prisma.draftOption.findMany({
                where: {
                    playerId: { in: optionIds },
                    draftSessionId: session.id,
                },
            });
            if (alt.length > 0) {
                // build mapping from playerId -> draftOption.id
                const playerToOption = new Map<string, string>();
                for (const a of alt) playerToOption.set(a.playerId, a.id);
                const remapped = optionIds.map(
                    (id) => playerToOption.get(id) || id,
                );
                // re-check
                foundOptions = await app.prisma.draftOption.findMany({
                    where: { id: { in: remapped }, draftSessionId: session.id },
                });
                if (foundOptions.length === remapped.length) {
                    // accept remapped optionIds going forward
                    optionIds = remapped;
                }
            }
        }

        if (foundOptions.length !== optionIds.length) {
            app.log.warn(
                {
                    optionIds,
                    found: foundOptions.length,
                    sessionId: session.id,
                },
                "pickDraftPlayers: invalid optionIds",
            );
            throw new AppError(
                "One or more optionIds are invalid for this draft session",
                400,
            );
        }

        // Prevent double-pick: ensure none of them are already picked
        const alreadyPicked = foundOptions.filter((o) => o.isPicked);
        if (alreadyPicked.length > 0) {
            app.log.warn(
                {
                    alreadyPicked: alreadyPicked.map((o) => o.id),
                    sessionId: session.id,
                },
                "pickDraftPlayers: option already picked",
            );
            throw new AppError("One or more options were already picked", 409);
        }

        // Atomic guarded update - mark selected options as picked only if still not picked
        const updateRes = await app.prisma.draftOption.updateMany({
            where: {
                id: { in: optionIds },
                draftSessionId: session.id,
                isPicked: false,
            },
            data: { isPicked: true },
        });

        if (!updateRes || updateRes.count !== optionIds.length) {
            // Race or partial update - surface conflict
            const refreshed = await app.prisma.draftOption.findMany({
                where: { id: { in: optionIds }, draftSessionId: session.id },
            });
            const nowPicked = refreshed
                .filter((r) => r.isPicked)
                .map((r) => r.id);
            app.log.warn(
                { nowPicked, sessionId: session.id },
                "pickDraftPlayers: partial update or race",
            );
            throw new AppError(
                `Failed to pick some options (may be already picked by another user): ${nowPicked.join(", ")}`,
                409,
            );
        }

        // Count picked and maybe advance step
        const pickedInStep = await app.prisma.draftOption.count({
            where: {
                draftSessionId: session.id,
                step: currentStep,
                isPicked: true,
            },
        });

        let nextStep = currentStep;
        let completedStep = false;
        if (pickedInStep >= config.picks) {
            await app.prisma.draftSession.update({
                where: { id: session.id },
                data: { step: config.next },
            });
            nextStep = config.next;
            completedStep = true;
        }

        // Re-fetch session to return authoritative state to client
        const freshSession = await app.prisma.draftSession.findUnique({
            where: { id: session.id },
            include: { options: { include: { player: true } } },
        });

        return {
            success: true,
            nextStep,
            completedStep,
            session: freshSession,
        };
    } catch (err: any) {
        app.log.error({ err, optionIds, userId }, "pickDraftPlayers failed");
        if (err instanceof AppError) throw err;
        throw new AppError("Failed to pick draft players", 500);
    }
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

        const teamResult = await app.prisma.$transaction(async (tx) => {
            const reserveConfig = [
                { role: "GOALKEEPER" as PlayerRole, count: DRAFT.RESERVE_GK },
                { role: "DEFENDER" as PlayerRole, count: DRAFT.RESERVE_DEF },
                { role: "MIDFIELDER" as PlayerRole, count: DRAFT.RESERVE_MID },
                { role: "FORWARD" as PlayerRole, count: DRAFT.RESERVE_FWD },
            ];

            const reserves = [];
            for (const rc of reserveConfig) {
                const generated = await generateMultiplePlayers(rc.count, {
                    role: rc.role,
                    ovrMin: DRAFT.RESERVE_OVR_MIN,
                    ovrMax: DRAFT.RESERVE_OVR_MAX,
                    seed: `reserve-${session.id}-${rc.role}`,
                });
                for (const gp of generated) {
                    const player = await tx.player.create({
                        data: { ...gp, ownerId: userId },
                    });
                    reserves.push(player);
                }
            }

            const cleanClubName = clubName?.trim();
            const team = await tx.team.create({
                data: {
                    name: cleanClubName || `${user?.clubName || "Player"} Team`,
                    userId,
                },
            });

            // Sort starters: FORWARD -> MIDFIELDER -> DEFENDER -> GOALKEEPER
            // To align with the UI formation layout indexes: 0-1 (FWD), 2-5 (MID), 6-9 (DEF), 10 (GK)
            const fwds = starters.filter((p: any) => p && p.role === "FORWARD");
            const mids = starters.filter(
                (p: any) => p && p.role === "MIDFIELDER",
            );
            const defs = starters.filter(
                (p: any) => p && p.role === "DEFENDER",
            );
            const gks = starters.filter(
                (p: any) => p && p.role === "GOALKEEPER",
            );
            const sortedStarters = [...fwds, ...mids, ...defs, ...gks];

            for (let i = 0; i < sortedStarters.length; i++) {
                const player = sortedStarters[i];
                if (!player || !player.id) {
                    app.log.warn(
                        { i, player, teamId: team.id },
                        "completeDraft: skipping invalid starter",
                    );
                    continue;
                }
                await tx.teamPlayer.create({
                    data: {
                        teamId: team.id,
                        playerId: player.id,
                        isStarter: true,
                        positionInFormation: i.toString(),
                    },
                });
            }

            for (const player of reserves) {
                if (!player || !player.id) continue;
                await tx.teamPlayer.create({
                    data: {
                        teamId: team.id,
                        playerId: player.id,
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

            await tx.team.update({
                where: { id: team.id },
                data: { rating },
            });

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
                reservesCount: reserves.length,
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
