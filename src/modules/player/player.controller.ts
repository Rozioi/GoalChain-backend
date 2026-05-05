import { FastifyReply, FastifyRequest } from "fastify";
import { FootballApiService } from "./football-api.service";

export const playerController = {
  async importFromApi(
    req: FastifyRequest<{
      Body: {
        leagueId: number;
        season?: number;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const apiService = new FootballApiService(req.server);
      const { leagueId, season } = req.body;
      
      const result = await apiService.importPlayersForLeague(leagueId, season);
      reply.send(result);
    } catch (err: any) {
      req.server.log.error(err);
      reply.status(500).send({ error: err.message });
    }
  },

  async populate(
    req: FastifyRequest<{
      Body: {
        count?: number;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const apiService = new FootballApiService(req.server);
      const result = await apiService.populateInitialDatabase(req.body.count);
      reply.send(result);
    } catch (err: any) {
      req.server.log.error(err);
      reply.status(500).send({ error: err.message });
    }
  }
};
