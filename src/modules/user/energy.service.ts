import { FastifyInstance } from "fastify";
import { ENERGY } from "../../config/constants";

export interface EnergyState {
  energy: number;
  maxEnergy: number;
  energyUpdatedAt: Date;
  nextRegenAt: string | null;
}

function computeEffectiveEnergy(
  storedEnergy: number,
  energyUpdatedAt: Date,
): { energy: number; energyUpdatedAt: Date } {
  if (storedEnergy >= ENERGY.MAX) {
    return { energy: ENERGY.MAX, energyUpdatedAt };
  }

  const now = Date.now();
  const elapsed = now - energyUpdatedAt.getTime();
  const regenUnits = Math.floor(elapsed / ENERGY.REGEN_INTERVAL_MS);

  if (regenUnits <= 0) {
    return { energy: storedEnergy, energyUpdatedAt };
  }

  const newEnergy = Math.min(ENERGY.MAX, storedEnergy + regenUnits);
  const newUpdatedAt = new Date(
    energyUpdatedAt.getTime() + regenUnits * ENERGY.REGEN_INTERVAL_MS,
  );

  return { energy: newEnergy, energyUpdatedAt: newUpdatedAt };
}

export function buildEnergyState(
  storedEnergy: number,
  energyUpdatedAt: Date,
): EnergyState {
  const synced = computeEffectiveEnergy(storedEnergy, energyUpdatedAt);

  let nextRegenAt: string | null = null;
  if (synced.energy < ENERGY.MAX) {
    nextRegenAt = new Date(
      synced.energyUpdatedAt.getTime() + ENERGY.REGEN_INTERVAL_MS,
    ).toISOString();
  }

  return {
    energy: synced.energy,
    maxEnergy: ENERGY.MAX,
    energyUpdatedAt: synced.energyUpdatedAt,
    nextRegenAt,
  };
}

export async function syncUserEnergy(
  app: FastifyInstance,
  userId: string,
): Promise<EnergyState> {
  const user = await app.prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const synced = computeEffectiveEnergy(user.energy, user.energyUpdatedAt);

  if (
    synced.energy !== user.energy ||
    synced.energyUpdatedAt.getTime() !== user.energyUpdatedAt.getTime()
  ) {
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

export async function assertHasEnergy(
  app: FastifyInstance,
  userId: string,
): Promise<EnergyState> {
  const state = await syncUserEnergy(app, userId);
  if (state.energy < 1) {
    throw new Error("Not enough energy. Wait for regeneration.");
  }
  return state;
}

export async function consumeEnergy(
  app: FastifyInstance,
  userId: string,
): Promise<EnergyState> {
  const user = await app.prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const synced = computeEffectiveEnergy(user.energy, user.energyUpdatedAt);
  if (synced.energy < 1) {
    throw new Error("Not enough energy. Wait for regeneration.");
  }

  const wasFull = synced.energy === ENERGY.MAX;
  const newEnergy = synced.energy - 1;
  const newUpdatedAt = wasFull ? new Date() : synced.energyUpdatedAt;

  await app.prisma.user.update({
    where: { id: userId },
    data: { energy: newEnergy, energyUpdatedAt: newUpdatedAt },
  });

  return buildEnergyState(newEnergy, newUpdatedAt);
}

export async function consumeEnergyForUsers(
  app: FastifyInstance,
  userIds: string[],
): Promise<void> {
  for (const userId of userIds) {
    await consumeEnergy(app, userId);
  }
}
