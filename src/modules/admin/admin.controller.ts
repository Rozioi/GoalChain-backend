import { FastifyRequest, FastifyReply } from "fastify";
import * as adminService from "./admin.service";

export const adminController = {
    stats: async (request: FastifyRequest, reply: FastifyReply) => {
        const stats = await adminService.getGlobalStats(request.server);
        return reply.send(stats);
    },

    listUsers: async (
        request: FastifyRequest<{
            Querystring: { search?: string; skip?: string; take?: string };
        }>,
        reply: FastifyReply,
    ) => {
        const { search, skip, take } = request.query;
        const result = await adminService.listUsers(request.server, {
            search,
            skip: skip ? parseInt(skip) : undefined,
            take: take ? parseInt(take) : undefined,
        });
        return reply.send(result);
    },

    updateUser: async (
        request: FastifyRequest<{
            Params: { id: string };
            Body: {
                coins?: number;
                points?: number;
                level?: number;
                username?: string;
                isAdmin?: boolean;
            };
        }>,
        reply: FastifyReply,
    ) => {
        const user = await adminService.updateUser(
            request.server,
            request.params.id,
            request.body,
        );
        return reply.send(user);
    },

    createSeason: async (
        request: FastifyRequest<{
            Body: {
                name: string;
                startDate: string;
                endDate: string;
                division: number;
            };
        }>,
        reply: FastifyReply,
    ) => {
        const season = await adminService.createSeason(request.server, {
            ...request.body,
            startDate: new Date(request.body.startDate),
            endDate: new Date(request.body.endDate),
        });
        return reply.status(201).send(season);
    },

    updateSeason: async (
        request: FastifyRequest<{
            Params: { id: string };
            Body: { status: any };
        }>,
        reply: FastifyReply,
    ) => {
        const season = await adminService.updateSeasonStatus(
            request.server,
            request.params.id,
            request.body.status,
        );
        return reply.send(season);
    },
    listSeasons: async (request: FastifyRequest, reply: FastifyReply) => {
        const seasons = await adminService.listSeasons(request.server);
        return reply.send(seasons);
    },
    endSeason: async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) => {
        const result = await adminService.endSeason(
            request.server,
            request.params.id,
        );
        return reply.send(result);
    },

    deleteUser: async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) => {
        try {
            const result = await adminService.deleteUser(
                request.server,
                request.params.id,
            );
            return reply.send(result);
        } catch (err: any) {
            return reply.status(400).send({ error: err.message });
        }
    },

    deleteUserTeam: async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
    ) => {
        try {
            const result = await adminService.deleteUserTeam(
                request.server,
                request.params.id,
            );
            return reply.send(result);
        } catch (err: any) {
            return reply.status(400).send({ error: err.message });
        }
    },

    broadcast: async (
        request: FastifyRequest<{
            Body: { text: string; photoBase64?: string };
        }>,
        reply: FastifyReply,
    ) => {
        try {
            const result = await adminService.broadcastMessage(
                request.server,
                request.body.text,
                request.body.photoBase64,
            );
            return reply.send(result);
        } catch (err: any) {
            return reply.status(400).send({ error: err.message });
        }
    },

    listRealPlayerTemplates: async (
        request: FastifyRequest,
        reply: FastifyReply,
    ) => {
        const templates = await adminService.getRealPlayerTemplates(
            request.server,
        );
        return reply.send(templates);
    },

    listReleasedRealPlayers: async (
        request: FastifyRequest,
        reply: FastifyReply,
    ) => {
        const players = await adminService.getReleasedRealPlayers(
            request.server,
        );
        return reply.send(players);
    },

    releaseRealPlayer: async (
        request: FastifyRequest<{ Params: { templateId: string } }>,
        reply: FastifyReply,
    ) => {
        try {
            const player = await adminService.releaseRealPlayerByTemplate(
                request.server,
                request.params.templateId,
            );
            return reply.status(201).send(player);
        } catch (err: any) {
            return reply.status(400).send({ error: err.message });
        }
    },

    // ── Config ──
    getConfigs: async (request: FastifyRequest, reply: FastifyReply) => {
        const { getConfigs } = await import("./admin-config.service");
        const configs = await getConfigs(request.server);
        return reply.send(configs);
    },

    setConfig: async (
        request: FastifyRequest<{ Body: { key: string; value: string } }>,
        reply: FastifyReply,
    ) => {
        try {
            const { setConfig } = await import("./admin-config.service");
            await setConfig(request.server, request.body.key, request.body.value);
            return reply.send({ success: true });
        } catch (err: any) {
            return reply.status(400).send({ error: err.message });
        }
    },

    // ── Analytics DAU ──
    getDau: async (request: FastifyRequest, reply: FastifyReply) => {
        const { env } = await import("../../config/env");

        const POSTHOG_PERSONAL_KEY = env.POSTHOG_PERSONAL_KEY;
        const PROJECT_ID = env.POSTHOG_PROJECT_ID;

        if (!POSTHOG_PERSONAL_KEY || !PROJECT_ID) {
            return reply.status(400).send({ error: "PostHog not configured" });
        }

        // In-memory cache (5 min TTL)
        const cacheKey = `posthog:dau`;
        const cached = (request.server as any)._dauCache as
            | { timestamp: number; data: any }
            | undefined;
        const now = Date.now();
        const CACHE_TTL = 5 * 60 * 1000;

        if (cached && now - cached.timestamp < CACHE_TTL) {
            return reply.send(cached.data);
        }

        try {
            const response = await fetch(
                `${env.POSTHOG_HOST}/api/projects/${PROJECT_ID}/query/`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${POSTHOG_PERSONAL_KEY}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        query: {
                            kind: "HogQLQuery",
                            query: `
                                SELECT
                                    toDate(timestamp) AS day,
                                    count(distinct distinct_id) AS dau
                                FROM events
                                WHERE event = 'app_opened'
                                  AND timestamp >= subtractDays(now(), 14)
                                GROUP BY day
                                ORDER BY day ASC
                            `,
                        },
                    }),
                },
            );

            if (!response.ok) {
                const text = await response.text();
                request.log.error(
                    { status: response.status, body: text },
                    "PostHog query failed",
                );
                return reply.status(502).send({ error: "PostHog query failed" });
            }

            const json: any = await response.json();

            const formattedData = (json.results || []).map(
                ([day, dau]: [string, number]) => ({
                    day,
                    dau,
                }),
            );

            (request.server as any)._dauCache = {
                timestamp: now,
                data: formattedData,
            };

            return reply.send(formattedData);
        } catch (err: any) {
            request.log.error(err, "Failed to fetch DAU from PostHog");
            return reply.status(500).send({ error: "Failed to fetch analytics" });
        }
    },
};
