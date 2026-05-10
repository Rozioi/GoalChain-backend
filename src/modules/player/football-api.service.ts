import { FastifyInstance } from "fastify";
import { Position, PlayerRole, PlayerStyle } from "@prisma/client";
import { generatePlayer } from "../player/player.generator";

export class FootballApiService {
  private apiKey =
    process.env.FOOTBALL_API_KEY || "9fcdea0c865d008bbaacd648b9bedd90";
  private baseUrl = "https://v3.football.api-sports.io";

  constructor(private app: FastifyInstance) {}

  async fetchPlayersFromApi(
    leagueId: number,
    season: number,
    page: number = 1,
  ) {
    const url = `${this.baseUrl}/players?league=${leagueId}&season=${season}&page=${page}`;
    this.app.log.info(`Requesting API: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-apisports-key": this.apiKey,
        "x-rapidapi-host": "v3.football.api-sports.io",
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * Maps and saves external players to the database
   */
  async importPlayersForLeague(leagueId: number, season: number = 2024) {
    this.app.log.info(
      `Importing players for league ${leagueId}, season ${season}...`,
    );

    let currentPage = 1;
    let totalPages = 1;
    let importedCount = 0;

    do {
      this.app.log.info(`Fetching page ${currentPage} from API...`);
      const result = await this.fetchPlayersFromApi(
        leagueId,
        season,
        currentPage,
      );

      if (!result || !result.response || result.response.length === 0) {
        this.app.log.warn(
          `API returned no data for league ${leagueId}, season ${season}, page ${currentPage}`,
        );
        this.app.log.debug(`Full API response: ${JSON.stringify(result)}`);
        break;
      }

      totalPages = result.paging?.total || 1;
      const playersData = result.response;
      this.app.log.info(
        `API returned ${playersData.length} players. Total pages: ${totalPages}`,
      );

      const playersToCreate = playersData.map((item: any) => {
        const p = item.player;
        const s = item.statistics[0]; // Take first statistics entry

        // Simple position mapping
        let position: Position = "ST";
        if (s.games.position === "Goalkeeper") position = "GK";
        else if (s.games.position === "Defender") position = "CB";
        else if (s.games.position === "Midfielder") position = "CM";
        else if (s.games.position === "Attacker") position = "ST";

        // Map role based on position
        let role: PlayerRole = "FORWARD";
        if (position === "GK") role = "GOALKEEPER";
        else if (["CB", "LB", "RB"].includes(position)) role = "DEFENDER";
        else if (["CM", "CDM", "CAM"].includes(position)) role = "MIDFIELDER";

        // Map stats (scale from 0-99)
        const overallRating = s.games.rating
          ? Math.round(parseFloat(s.games.rating) * 10)
          : 70;

        return {
          name: p.firstname,
          surname: p.lastname,
          overallRating: Math.min(99, overallRating),
          position,
          role,
          style: "TECHNICAL" as PlayerStyle, // Default style
          pace: 70, // API doesn't always provide detailed pace/shooting in the basic response
          shooting: 70,
          passing: 70,
          dribbling: 70,
          defending: 70,
          physical: 70,
          goalkeeping: position === "GK" ? overallRating : 10,
          heightCm: parseInt(p.height) || 180,
          weightKg: parseInt(p.weight) || 75,
          age: p.age || 25,
          nationality: p.nationality || "Unknown",
          country: p.birth.country || "Unknown",
          club: s.team.name,
          clubId: s.team.id,
          leagueId: s.league.id,
          leagueDivisionId: 1, // Assumption
          imageUrl: p.photo,
          face: "face_1",
          rarity: overallRating > 85 ? "gold" : "common",
          formValue: 1.0,
        };
      });

      // Batch create in DB
      await this.app.prisma.player.createMany({
        data: playersToCreate,
        skipDuplicates: true, // Avoid duplicates if re-running
      });

      importedCount += playersToCreate.length;
      this.app.log.info(
        `Page ${currentPage}/${totalPages} imported (${importedCount} total)`,
      );
      currentPage++;

      // Rate limiting: sleep briefly between pages
      await new Promise((r) => setTimeout(r, 1000));
    } while (currentPage <= totalPages);

    return { leagueId, importedCount };
  }

  /**
   * Generates a batch of real-world-like players based on the requested count
   */
  async populateInitialDatabase(count: number = 68000) {
    this.app.log.info(`Starting population of ${count} players...`);

    // We'll process in batches to avoid memory issues
    const batchSize = 100;
    const batches = Math.ceil(count / batchSize);

    for (let i = 0; i < batches; i++) {
      const playersToCreate = [];
      for (let j = 0; j < batchSize; j++) {
        const generated = generatePlayer({
          seed: `init-${i}-${j}-${Date.now()}`,
        });
        playersToCreate.push(generated);
      }

      await this.app.prisma.player.createMany({
        data: playersToCreate as any,
      });

      this.app.log.info(`Created batch ${i + 1}/${batches}`);
    }

    return { success: true, count };
  }
}
