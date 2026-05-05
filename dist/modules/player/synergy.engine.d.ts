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
