import { FastifyInstance } from "fastify";
export declare class FootballApiService {
    private app;
    private apiKey;
    private baseUrl;
    constructor(app: FastifyInstance);
    fetchPlayersFromApi(leagueId: number, season: number, page?: number): Promise<any>;
    importPlayersForLeague(leagueId: number, season?: number): Promise<{
        leagueId: number;
        importedCount: number;
    }>;
    populateInitialDatabase(count?: number): Promise<{
        success: boolean;
        count: number;
    }>;
}
