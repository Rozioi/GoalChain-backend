import { Position, PlayerRole, PlayerStyle } from "@prisma/client";
interface GenerateOptions {
    position?: Position;
    role?: PlayerRole;
    ovrMin?: number;
    ovrMax?: number;
    seed?: string;
}
export interface GeneratedPlayer {
    name: string;
    ovr: number;
    position: Position;
    role: PlayerRole;
    style: PlayerStyle;
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physical: number;
    goalkeeping: number;
    potential: number;
    form: number;
    age: number;
    nationality: string;
    club: string;
}
export declare function generatePlayer(options?: GenerateOptions): GeneratedPlayer;
export declare function generateMultiplePlayers(count: number, options?: GenerateOptions): GeneratedPlayer[];
export {};
