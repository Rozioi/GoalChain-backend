import { FastifyInstance } from "fastify";
export interface TeamPreviewSide {
    teamId: string;
    name: string;
    ovr: number;
    publicOvr: number;
    clubIcon: string | null;
    points: number;
    attack: number;
    midfield: number;
    defence: number;
    isBot: boolean;
}
export declare function buildTeamPreview(app: FastifyInstance, teamId: string, isBot?: boolean): Promise<TeamPreviewSide | null>;
export declare function buildMatchPreview(app: FastifyInstance, match: {
    homeTeamId: string;
    awayTeamId: string | null;
    isBot: boolean;
}): Promise<{
    home: TeamPreviewSide | null;
    away: TeamPreviewSide | null;
}>;
