import { FastifyInstance } from "fastify";
import { PlayerRole, DraftStep } from "@prisma/client";
import { generateMultiplePlayers } from "../player/player.generator";
import { calculateTeamSynergy, calculateTeamRating } from "../player/synergy.engine";
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
    // Check if user already has a team
    const existingTeam = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
    });
    if (existingTeam) {
        throw new Error("You already have a team. Draft is only for new users.");
    }

    // Check if there's already an active draft
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

    if (!session) throw new Error("No active draft session");

    const stepUpper = step.toUpperCase();
    if (session.step !== stepUpper) {
        throw new Error(`Current draft step is ${session.step}, not ${stepUpper}`);
    }

    // Check if options already exist for this step
    const existingOptions = session.options.filter((o: any) => o.step === stepUpper && !o.isPicked);
    if (existingOptions.length > 0) {
        return {
            session,
            options: existingOptions.map((o: any) => ({ ...o.player, optionId: o.id })),
            config: STEP_CONFIG[stepUpper],
        };
    }

    // Generate new options
    const config = STEP_CONFIG[stepUpper];
    if (!config) throw new Error(`Invalid draft step: ${stepUpper}`);

    const generatedPlayers = generateMultiplePlayers(config.count, {
        role: config.role,
        ovrMin: DRAFT.STARTER_OVR_MIN,
        ovrMax: DRAFT.STARTER_OVR_MAX,
        seed: `draft-${session.id}-${stepUpper}`,
    });

    // Create players in DB and draft options
    const options = [];
    for (const gp of generatedPlayers) {
        const player = await app.prisma.player.create({ data: gp });
        const option = await app.prisma.draftOption.create({
            data: {
                draftSessionId: session.id,
                playerId: player.id,
                step: stepUpper as DraftStep,
            },
        });
        options.push({ ...player, optionId: option.id });
    }

    // Calculate synergy suggestions with already picked players
    const pickedOptions = session.options.filter((o: any) => o.isPicked);
    const pickedPlayers = pickedOptions.map((o: any) => o.player);

    const suggestions = options.map((opt: any) => {
        const testTeam = [
            ...pickedPlayers.map((p: any) => ({
                position: p.position,
                role: p.role,
                style: p.style,
                ovr: p.ovr,
            })),
            { position: opt.position, role: opt.role, style: opt.style, ovr: opt.ovr },
        ];
        const synergy = calculateTeamSynergy(testTeam);
        return {
            ...opt,
            synergy: synergy.totalBonus,
            synergyDetails: synergy.details,
        };
    });

    return { session, options: suggestions, config };
}

export async function pickDraftPlayers(
    app: FastifyInstance,
    userId: string,
    optionIds: string[],
) {
    const session = await app.prisma.draftSession.findFirst({
        where: { userId, status: "IN_PROGRESS" },
        include: { options: true },
    });

    if (!session) throw new Error("No active draft session");

    const currentStep = session.step;
    const config = STEP_CONFIG[currentStep];
    if (!config) throw new Error("Draft is in reserve/done phase");

    // Mark picks
    await app.prisma.draftOption.updateMany({
        where: { id: { in: optionIds } },
        data: { isPicked: true },
    });

    // Check if we've reached the required number of picks for this step
    const pickedInStep = await app.prisma.draftOption.count({
        where: {
            draftSessionId: session.id,
            step: currentStep,
            isPicked: true,
        },
    });

    if (pickedInStep >= config.picks) {
        // Advance step
        await app.prisma.draftSession.update({
            where: { id: session.id },
            data: { step: config.next },
        });
        return { success: true, nextStep: config.next, completedStep: true };
    }

    return { success: true, nextStep: currentStep, completedStep: false };
}

export async function completeDraft(app: FastifyInstance, userId: string) {
    const session = await app.prisma.draftSession.findFirst({
        where: { userId, status: "IN_PROGRESS" },
        include: { options: { include: { player: true } } },
    });

    if (!session) throw new Error("No active draft session");

    // Get picked starters
    const starters = session.options
        .filter((o: any) => o.isPicked)
        .map((o: any) => o.player);

    if (starters.length !== 11) {
        throw new Error(`Need 11 starters, have ${starters.length}`);
    }

    // Generate reserve players
    const reserveConfig = [
        { role: "GOALKEEPER" as PlayerRole, count: DRAFT.RESERVE_GK },
        { role: "DEFENDER" as PlayerRole, count: DRAFT.RESERVE_DEF },
        { role: "MIDFIELDER" as PlayerRole, count: DRAFT.RESERVE_MID },
        { role: "FORWARD" as PlayerRole, count: DRAFT.RESERVE_FWD },
    ];

    const reserves = [];
    for (const rc of reserveConfig) {
        const generated = generateMultiplePlayers(rc.count, {
            role: rc.role,
            ovrMin: DRAFT.RESERVE_OVR_MIN,
            ovrMax: DRAFT.RESERVE_OVR_MAX,
            seed: `reserve-${session.id}-${rc.role}`,
        });
        for (const gp of generated) {
            const player = await app.prisma.player.create({ data: gp });
            reserves.push(player);
        }
    }

    // Create team
    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    const team = await app.prisma.team.create({
        data: {
            name: `${user?.firstName || "Player"}'s Team`,
            userId,
        },
    });

    // Add starters
    for (const player of starters) {
        await app.prisma.teamPlayer.create({
            data: {
                teamId: team.id,
                playerId: player.id,
                isStarter: true,
                positionInFormation: player.position,
            },
        });
    }

    // Add reserves
    for (const player of reserves) {
        await app.prisma.teamPlayer.create({
            data: {
                teamId: team.id,
                playerId: player.id,
                isStarter: false,
            },
        });
    }

    // Calculate team rating
    const rating = calculateTeamRating(
        starters.map((p: any) => ({
            position: p.position,
            role: p.role,
            style: p.style,
            ovr: p.ovr,
        })),
    );

    await app.prisma.team.update({
        where: { id: team.id },
        data: { rating },
    });

    // Complete draft
    await app.prisma.draftSession.update({
        where: { id: session.id },
        data: { status: "COMPLETED", step: "DONE" as DraftStep, teamId: team.id },
    });

    return {
        team: {
            id: team.id,
            name: team.name,
            rating,
            starters: starters.length,
            reserves: reserves.length,
            total: starters.length + reserves.length,
        },
    };
}
