import { FastifyInstance } from "fastify";
export declare class FootballApiService {
    private app;
    private apiKey;
    private baseUrl;
    constructor(app: FastifyInstance);
    /**
     * Fetches players from API-Football for a specific league and page
     */
    fetchPlayersFromApi(leagueId: number, season: number, page?: number): Promise<any>;
    /**
     * Maps and saves external players to the database
     */
    importPlayersForLeague(leagueId: number, season?: number): Promise<{
        leagueId: number;
        importedCount: number;
    }>;
    /**
     * Generates a batch of real-world-like players based on the requested count
     */
    populateInitialDatabase(count?: number): Promise<{
        success: boolean;
        count: number;
    }>;
}
