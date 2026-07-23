/**
 * Fatigue system for GoalChain.
 *
 * Fatigue zones:
 *   - White  (0-33):  Fresh — full stats
 *   - Yellow (34-66): Tired — reduced stats
 *   - Red    (67-100): Exhausted — critical penalty, high injury risk
 *
 * Fatigue is 0-100, where 0 = fully fresh, 100 = completely exhausted.
 * The bar display uses getStaminaPercent() which inverts: 100% fresh = 0 fatigue.
 */

/**
 * Fatigue regen rate: +10 points per full hour of rest without a match.
 * Fatigue regen is calculated based on time elapsed since the player's
 * last update (updatedAt), so even offline players recover naturally.
 */
export const FATIGUE_REGEN_PER_HOUR = 10;

/** Fatigue thresholds */
export const FATIGUE = {
    WHITE_MAX: 33,
    YELLOW_MAX: 66,
    RED_MAX: 100,
} as const;

export type FatigueZone = "white" | "yellow" | "red";

/** Get fatigue zone from raw fatigue value (0-100) */
export function getFatigueZone(fatigue: number): FatigueZone {
    if (fatigue <= FATIGUE.WHITE_MAX) return "white";
    if (fatigue <= FATIGUE.YELLOW_MAX) return "yellow";
    return "red";
}

/** Get display color for the fatigue bar based on raw fatigue */
export function getFatigueBarColor(fatigue: number): string {
    const zone = getFatigueZone(fatigue);
    switch (zone) {
        case "white":
            return "#ffffff";
        case "yellow":
            return "#ffcc00";
        case "red":
            return "#ff4d4d";
    }
}

/** Get fatigue bar percentage (inverted: 0 fatigue = 100% bar) */
export function getFatigueBarPercent(fatigue: number): number {
    return Math.max(0, 100 - fatigue);
}

// ----- Stat modifiers based on fatigue zone -----

export interface FatigueModifiers {
    /** Speed / pace multiplier (1.0 = 100%) */
    speedMultiplier: number;
    /** All action effectiveness multiplier (shooting, passing, defending, etc.) */
    effectivenessMultiplier: number;
    /** Fatigue drain rate multiplier (1.0 = standard) */
    drainRateMultiplier: number;
    /** Injury probability multiplier (1.0 = base) */
    injuryRiskMultiplier: number;
}

/** Default fresh modifiers */
const FRESH_MODIFIERS: FatigueModifiers = {
    speedMultiplier: 1.0,
    effectivenessMultiplier: 1.0,
    drainRateMultiplier: 1.0,
    injuryRiskMultiplier: 1.0,
};

const TIRED_MODIFIERS: FatigueModifiers = {
    speedMultiplier: 0.82,   // -18%
    effectivenessMultiplier: 0.85, // -15%
    drainRateMultiplier: 1.3,     // +30% drain
    injuryRiskMultiplier: 2.0,    // 2x injury risk
};

const EXHAUSTED_MODIFIERS: FatigueModifiers = {
    speedMultiplier: 0.62,   // -38%
    effectivenessMultiplier: 0.60, // -40%
    drainRateMultiplier: 1.8,     // +80% drain
    injuryRiskMultiplier: 4.0,    // 4x injury risk
};

/** Get fatigue modifiers for a given fatigue value */
export function getFatigueModifiers(fatigue: number): FatigueModifiers {
    const zone = getFatigueZone(fatigue);
    switch (zone) {
        case "white":
            return FRESH_MODIFIERS;
        case "yellow":
            return TIRED_MODIFIERS;
        case "red":
            return EXHAUSTED_MODIFIERS;
    }
}

/**
 * Apply fatigue modifiers to a player's base stats for match simulation.
 * Returns modified stat values.
 */
export function applyFatigueToStats(
    pace: number,
    fatigue: number,
): number {
    const mods = getFatigueModifiers(fatigue);
    return Math.round(pace * mods.speedMultiplier);
}

/**
 * Calculate effective stat after fatigue penalty.
 */
export function getEffectiveStat(
    baseStat: number,
    fatigue: number,
): number {
    const mods = getFatigueModifiers(fatigue);
    return Math.round(baseStat * mods.effectivenessMultiplier);
}

/**
 * Fatigue drain rate for a single game minute.
 * @param fatigue current fatigue level
 * @param pressingType team pressing strategy
 * @returns fatigue increase for this minute
 */
export function getFatigueDrain(
    fatigue: number,
    pressingType: "SOFT" | "MEDIUM" | "INTENSIVE",
): number {
    const mods = getFatigueModifiers(fatigue);

    let baseRate: number;
    switch (pressingType) {
        case "INTENSIVE":
            baseRate = 1.0;
            break;
        case "MEDIUM":
            baseRate = 0.5;
            break;
        case "SOFT":
        default:
            baseRate = 0.25;
            break;
    }

    return Math.round((baseRate * mods.drainRateMultiplier) * 100) / 100;
}

/**
 * Injury check. Call during intense actions (sprint, tackle, shot)
 * when player is in red fatigue zone.
 *
 * @param fatigue current fatigue
 * @param rng random function (0-1)
 * @param actionBaseChance base injury chance for this action (e.g. 0.02 for tackle)
 * @returns true if injury occurs
 */
export function checkFatigueInjury(
    fatigue: number,
    rng: () => number,
    actionBaseChance: number = 0.02,
): boolean {
    const zone = getFatigueZone(fatigue);
    if (zone !== "red") return false;

    const mods = getFatigueModifiers(fatigue);
    // Scale injury chance: higher fatigue = more likely
    const fatigueScale = 1 + (fatigue - FATIGUE.YELLOW_MAX) / FATIGUE.RED_MAX;
    const adjustedChance = actionBaseChance * mods.injuryRiskMultiplier * fatigueScale;

    return rng() < adjustedChance;
}

/** Human-readable label for the current fatigue zone */
export function getFatigueZoneLabel(fatigue: number): string {
    const zone = getFatigueZone(fatigue);
    switch (zone) {
        case "white":
            return "full";
        case "yellow":
            return "medium";
        case "red":
            return "low";
    }
}

// ----- Fatigue regen (passive recovery over time) -----

/**
 * Calculate how many hours have passed since the given date.
 */
function hoursSince(date: Date): number {
    const diffMs = Date.now() - date.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
}

/**
 * Calculate the effective fatigue after passive regen.
 * Each full hour of rest restores FATIGUE_REGEN_PER_HOUR points.
 *
 * @param storedFatigue - fatigue value stored in DB (as of last update)
 * @param lastUpdatedAt - player.updatedAt timestamp
 * @returns recalculated fatigue (never below 0)
 */
export function recalculateFatigue(
    storedFatigue: number,
    lastUpdatedAt: Date,
): number {
    const hours = hoursSince(lastUpdatedAt);
    const regen = hours * FATIGUE_REGEN_PER_HOUR;
    return Math.max(0, storedFatigue - regen);
}

/**
 * Update a player's fatigue in the database to reflect passive regen.
 * This persists the recalculated value and resets updatedAt so future
 * regen calculations start from this moment.
 *
 * @returns the player object with updated fatigue
 */
export async function applyFatigueRegenToPlayer(
    app: { prisma: { player: { update: Function } } },
    player: { id: string; fatigue: number; updatedAt: Date },
): Promise<{ id: string; fatigue: number; updatedAt: Date }> {
    const currentFatigue = recalculateFatigue(player.fatigue, player.updatedAt);
    if (currentFatigue === player.fatigue) return player;

    return app.prisma.player.update({
        where: { id: player.id },
        data: { fatigue: currentFatigue },
    });
}

/**
 * Apply passive fatigue regen to every player in a team roster.
 * Call this before loading teams for a match, so the simulator
 * works with up-to-date fatigue values.
 */
export async function applyFatigueRegenToTeam(
    app: { prisma: { player: { update: Function } } },
    players: Array<{ id: string; fatigue: number; updatedAt: Date }>,
): Promise<void> {
    for (const player of players) {
        const currentFatigue = recalculateFatigue(player.fatigue, player.updatedAt);
        if (currentFatigue !== player.fatigue) {
            await app.prisma.player.update({
                where: { id: player.id },
                data: { fatigue: currentFatigue },
            });
        }
    }
}
