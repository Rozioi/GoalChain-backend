import { PlayerStyle, PlayerRole } from "@prisma/client";
export interface SynergyPlayer {
    position: string;
    role: PlayerRole;
    style: PlayerStyle;
    overallRating: number;
}
export interface SynergyResult {
    totalBonus: number;
    details: string[];
}
export declare function calculateTeamSynergy(players: SynergyPlayer[]): SynergyResult;
export declare function calculateTeamRating(players: SynergyPlayer[]): number;
/** Средний OVR всего состава (старт + скамейка), без синергии */
export declare function calculatePublicRating(players: SynergyPlayer[]): number;
/**
 * Рассчитывает OVR игрока на основе его параметров и позиции.
 * Используется после тренировки для пересчёта.
 */
export declare function calculatePlayerOverall(player: {
    role?: string;
    position?: string;
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
    goalkeeping?: number;
}): number;
