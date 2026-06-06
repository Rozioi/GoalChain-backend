"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDraft = startDraft;
exports.getDraftOptions = getDraftOptions;
exports.pickDraftPlayers = pickDraftPlayers;
exports.completeDraft = completeDraft;
const player_generator_1 = require("../player/player.generator");
const synergy_engine_1 = require("../player/synergy.engine");
const constants_1 = require("../../config/constants");
const STEP_CONFIG = {
    GK: {
        role: "GOALKEEPER",
        count: constants_1.DRAFT.STARTER_GK_OPTIONS,
        picks: constants_1.DRAFT.STARTER_GK_PICKS,
        next: "DEF",
    },
    DEF: {
        role: "DEFENDER",
        count: constants_1.DRAFT.STARTER_DEF_OPTIONS,
        picks: constants_1.DRAFT.STARTER_DEF_PICKS,
        next: "MID",
    },
    MID: {
        role: "MIDFIELDER",
        count: constants_1.DRAFT.STARTER_MID_OPTIONS,
        picks: constants_1.DRAFT.STARTER_MID_PICKS,
        next: "FWD",
    },
    FWD: {
        role: "FORWARD",
        count: constants_1.DRAFT.STARTER_FWD_OPTIONS,
        picks: constants_1.DRAFT.STARTER_FWD_PICKS,
        next: "RESERVE",
    },
};
async function startDraft(app, userId) {
    const existingTeam = await app.prisma.team.findFirst({
        where: { userId, isEvent: false },
    });
    if (existingTeam) {
        throw new Error("You already have a team. Draft is only for new users.");
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
async function getDraftOptions(app, userId, step) {
    const session = await app.prisma.draftSession.findFirst({
        where: { userId, status: "IN_PROGRESS" },
        include: { options: { include: { player: true } } },
    });
    console.log(session);
    if (!session)
        throw new Error("No active draft session");
    const stepUpper = step.toUpperCase();
    if (session.step !== stepUpper) {
        throw new Error(`Current draft step is ${session.step}, not ${stepUpper}`);
    }
    const existingOptions = session.options.filter((o) => o.step === stepUpper && !o.isPicked);
    if (existingOptions.length > 0) {
        return {
            session,
            options: existingOptions.map((o) => ({
                ...o.player,
                ovr: o.player.overallRating,
                optionId: o.id,
            })),
            config: STEP_CONFIG[stepUpper],
        };
    }
    const config = STEP_CONFIG[stepUpper];
    if (!config)
        throw new Error(`Invalid draft step: ${stepUpper}`);
    console.log("final step: ", config);
    const generatedPlayers = await (0, player_generator_1.generateMultiplePlayers)(config.count, {
        role: config.role,
        ovrMin: constants_1.DRAFT.STARTER_OVR_MIN,
        ovrMax: constants_1.DRAFT.STARTER_OVR_MAX,
        seed: `draft-${session.id}-${stepUpper}`,
    });
    console.log(generatedPlayers);
    const options = [];
    for (const gp of generatedPlayers) {
        const player = await app.prisma.player.create({
            data: { ...gp, ownerId: userId },
        });
        const option = await app.prisma.draftOption.create({
            data: {
                draftSessionId: session.id,
                playerId: player.id,
                step: stepUpper,
            },
        });
        options.push({ ...player, ovr: player.overallRating, optionId: option.id });
    }
    const pickedOptions = session.options.filter((o) => o.isPicked);
    const pickedPlayers = pickedOptions.map((o) => o.player);
    console.log("final step: ", session, config);
    const suggestions = options.map((opt) => {
        const testTeam = [
            ...pickedPlayers.map((p) => ({
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
        const synergy = (0, synergy_engine_1.calculateTeamSynergy)(testTeam);
        return {
            ...opt,
            ovr: opt.overallRating,
            synergy: synergy.totalBonus,
            synergyDetails: synergy.details,
        };
    });
    console.log("final step: ", session, suggestions, config);
    return { session, options: suggestions, config };
}
async function pickDraftPlayers(app, userId, optionIds) {
    const session = await app.prisma.draftSession.findFirst({
        where: { userId, status: "IN_PROGRESS" },
        include: { options: true },
    });
    if (!session)
        throw new Error("No active draft session");
    const currentStep = session.step;
    const config = STEP_CONFIG[currentStep];
    if (!config)
        throw new Error("Draft is in reserve/done phase");
    await app.prisma.draftOption.updateMany({
        where: { id: { in: optionIds } },
        data: { isPicked: true },
    });
    const pickedInStep = await app.prisma.draftOption.count({
        where: {
            draftSessionId: session.id,
            step: currentStep,
            isPicked: true,
        },
    });
    if (pickedInStep >= config.picks) {
        await app.prisma.draftSession.update({
            where: { id: session.id },
            data: { step: config.next },
        });
        return { success: true, nextStep: config.next, completedStep: true };
    }
    return { success: true, nextStep: currentStep, completedStep: false };
}
async function completeDraft(app, userId) {
    const session = await app.prisma.draftSession.findFirst({
        where: { userId, status: "IN_PROGRESS" },
        include: { options: { include: { player: true } } },
    });
    if (!session)
        throw new Error("No active draft session");
    const starters = session.options
        .filter((o) => o.isPicked)
        .map((o) => o.player);
    if (starters.length !== 11) {
        throw new Error(`Need 11 starters, have ${starters.length}`);
    }
    const reserveConfig = [
        { role: "GOALKEEPER", count: constants_1.DRAFT.RESERVE_GK },
        { role: "DEFENDER", count: constants_1.DRAFT.RESERVE_DEF },
        { role: "MIDFIELDER", count: constants_1.DRAFT.RESERVE_MID },
        { role: "FORWARD", count: constants_1.DRAFT.RESERVE_FWD },
    ];
    const reserves = [];
    for (const rc of reserveConfig) {
        const generated = await (0, player_generator_1.generateMultiplePlayers)(rc.count, {
            role: rc.role,
            ovrMin: constants_1.DRAFT.RESERVE_OVR_MIN,
            ovrMax: constants_1.DRAFT.RESERVE_OVR_MAX,
            seed: `reserve-${session.id}-${rc.role}`,
        });
        for (const gp of generated) {
            const player = await app.prisma.player.create({
                data: { ...gp, ownerId: userId },
            });
            reserves.push(player);
        }
    }
    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    const team = await app.prisma.team.create({
        data: {
            name: `${user?.firstName || "Player"}'s Team`,
            userId,
        },
    });
    // Sort starters: FORWARD -> MIDFIELDER -> DEFENDER -> GOALKEEPER
    // To align with the UI formation layout indexes: 0-1 (FWD), 2-5 (MID), 6-9 (DEF), 10 (GK)
    const fwds = starters.filter((p) => p.role === "FORWARD");
    const mids = starters.filter((p) => p.role === "MIDFIELDER");
    const defs = starters.filter((p) => p.role === "DEFENDER");
    const gks = starters.filter((p) => p.role === "GOALKEEPER");
    const sortedStarters = [...fwds, ...mids, ...defs, ...gks];
    for (let i = 0; i < sortedStarters.length; i++) {
        const player = sortedStarters[i];
        await app.prisma.teamPlayer.create({
            data: {
                teamId: team.id,
                playerId: player.id,
                isStarter: true,
                positionInFormation: i.toString(),
            },
        });
    }
    for (const player of reserves) {
        await app.prisma.teamPlayer.create({
            data: {
                teamId: team.id,
                playerId: player.id,
                isStarter: false,
            },
        });
    }
    const rating = (0, synergy_engine_1.calculateTeamRating)(starters.map((p) => ({
        position: p.position,
        role: p.role,
        style: p.style,
        overallRating: p.overallRating,
    })));
    await app.prisma.team.update({
        where: { id: team.id },
        data: { rating },
    });
    await app.prisma.draftSession.update({
        where: { id: session.id },
        data: { status: "COMPLETED", step: "DONE", teamId: team.id },
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
