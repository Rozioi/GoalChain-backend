"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildEnergyState = buildEnergyState;
exports.syncUserEnergy = syncUserEnergy;
exports.assertHasEnergy = assertHasEnergy;
exports.consumeEnergy = consumeEnergy;
exports.consumeEnergyForUsers = consumeEnergyForUsers;
const constants_1 = require("../../config/constants");
function computeEffectiveEnergy(storedEnergy, energyUpdatedAt) {
    if (storedEnergy >= constants_1.ENERGY.MAX) {
        return { energy: constants_1.ENERGY.MAX, energyUpdatedAt };
    }
    const now = Date.now();
    const elapsed = now - energyUpdatedAt.getTime();
    const regenUnits = Math.floor(elapsed / constants_1.ENERGY.REGEN_INTERVAL_MS);
    if (regenUnits <= 0) {
        return { energy: storedEnergy, energyUpdatedAt };
    }
    const newEnergy = Math.min(constants_1.ENERGY.MAX, storedEnergy + regenUnits);
    const newUpdatedAt = new Date(energyUpdatedAt.getTime() + regenUnits * constants_1.ENERGY.REGEN_INTERVAL_MS);
    return { energy: newEnergy, energyUpdatedAt: newUpdatedAt };
}
function buildEnergyState(storedEnergy, energyUpdatedAt) {
    const synced = computeEffectiveEnergy(storedEnergy, energyUpdatedAt);
    let nextRegenAt = null;
    if (synced.energy < constants_1.ENERGY.MAX) {
        nextRegenAt = new Date(synced.energyUpdatedAt.getTime() + constants_1.ENERGY.REGEN_INTERVAL_MS).toISOString();
    }
    return {
        energy: synced.energy,
        maxEnergy: constants_1.ENERGY.MAX,
        energyUpdatedAt: synced.energyUpdatedAt,
        nextRegenAt,
    };
}
async function syncUserEnergy(app, userId) {
    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error("User not found");
    const synced = computeEffectiveEnergy(user.energy, user.energyUpdatedAt);
    if (synced.energy !== user.energy ||
        synced.energyUpdatedAt.getTime() !== user.energyUpdatedAt.getTime()) {
        await app.prisma.user.update({
            where: { id: userId },
            data: {
                energy: synced.energy,
                energyUpdatedAt: synced.energyUpdatedAt,
            },
        });
    }
    return buildEnergyState(synced.energy, synced.energyUpdatedAt);
}
async function assertHasEnergy(app, userId) {
    const state = await syncUserEnergy(app, userId);
    if (state.energy < 1) {
        throw new Error("Not enough energy. Wait for regeneration.");
    }
    return state;
}
async function consumeEnergy(app, userId) {
    const user = await app.prisma.user.findUnique({ where: { id: userId } });
    if (!user)
        throw new Error("User not found");
    const synced = computeEffectiveEnergy(user.energy, user.energyUpdatedAt);
    if (synced.energy < 1) {
        throw new Error("Not enough energy. Wait for regeneration.");
    }
    const wasFull = synced.energy === constants_1.ENERGY.MAX;
    const newEnergy = synced.energy - 1;
    const newUpdatedAt = wasFull ? new Date() : synced.energyUpdatedAt;
    await app.prisma.user.update({
        where: { id: userId },
        data: { energy: newEnergy, energyUpdatedAt: newUpdatedAt },
    });
    return buildEnergyState(newEnergy, newUpdatedAt);
}
async function consumeEnergyForUsers(app, userIds) {
    for (const userId of userIds) {
        await consumeEnergy(app, userId);
    }
}
