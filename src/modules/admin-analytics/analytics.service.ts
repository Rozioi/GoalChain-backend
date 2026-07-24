import { FastifyInstance } from "fastify";
import { env } from "../../config/env";

// ─── Types ───

interface OnlineMetrics {
  onlineNow: number;
  matchesNow: number;
}

interface UserMetrics {
  totalUsers: number;
  newUsersToday: number;
  newUsers7d: number;
  newUsers30d: number;
  dau: number;
  wau: number;
  mau: number;
}

interface RetentionMetrics {
  d1: number;
  d7: number;
  d30: number;
}

interface ActivityMetrics {
  avgMatchesPerUser: number;
  avgSessionsPerUser: number;
  avgSessionDurationSec: number;
  avgMatchesPerDay: number;
  percentUsersPlayedMatch: number;
}

interface ScoutingStats {
  totalRevenueTon: number;
  totalOpens: number;
  bySet: { label: string; opens: number; purchases: number }[];
  topBuyers: { userId: string; username: string | null; spentTon: number }[];
}

interface NftStats {
  totalMinted: number;
  last24h: number;
  last7d: number;
}

// ─── PostHog helper ───

type CacheEntry = { timestamp: number; data: any };
const CACHE_TTL = 5 * 60 * 1000; // 5 min

function getCache(app: FastifyInstance, key: string): any | null {
  const cache = (app as any)._phCache?.get(key) as CacheEntry | undefined;
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) return cache.data;
  return null;
}

function setCache(app: FastifyInstance, key: string, data: any) {
  if (!(app as any)._phCache) (app as any)._phCache = new Map();
  (app as any)._phCache.set(key, { timestamp: Date.now(), data });
}

async function queryPosthog(query: string): Promise<any[]> {
  if (!env.POSTHOG_PERSONAL_KEY || !env.POSTHOG_PROJECT_ID) {
    throw new Error("PostHog not configured");
  }

  const response = await fetch(
    `${env.POSTHOG_HOST}/api/projects/${env.POSTHOG_PROJECT_ID}/query/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.POSTHOG_PERSONAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: { kind: "HogQLQuery", query },
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PostHog query failed: ${response.status} ${text}`);
  }

  const json: any = await response.json();
  return json.results || [];
}

// ─── Metrics ───

export async function getOnlineMetrics(app: FastifyInstance): Promise<OnlineMetrics> {
  const [matchesNow] = await Promise.all([
    app.prisma.match.count({
      where: { status: "IN_PROGRESS" },
    }),
  ]);

  // Online now approximates as users in active matches * 2 (2 users per match)
  const onlineNow = matchesNow * 2;

  return { onlineNow, matchesNow };
}

export async function getUserMetrics(app: FastifyInstance): Promise<UserMetrics> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [totalUsers, newUsersToday, newUsers7d, newUsers30d] = await Promise.all([
    app.prisma.user.count(),
    app.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    app.prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    app.prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
  ]);

  // DAU/WAU/MAU from PostHog (app_opened event)
  let dau = 0, wau = 0, mau = 0;
  try {
    const cacheKey = "ph:dau_wau_mau";
    let cached = getCache(app, cacheKey);
    if (!cached) {
      const [dauRows, wauRows, mauRows] = await Promise.all([
        queryPosthog(`
          SELECT count(distinct distinct_id) AS val
          FROM events
          WHERE event = 'app_opened'
            AND timestamp >= addDays(now(), -1)
        `),
        queryPosthog(`
          SELECT count(distinct distinct_id) AS val
          FROM events
          WHERE event = 'app_opened'
            AND timestamp >= addDays(now(), -7)
        `),
        queryPosthog(`
          SELECT count(distinct distinct_id) AS val
          FROM events
          WHERE event = 'app_opened'
            AND timestamp >= addDays(now(), -30)
        `),
      ]);
      cached = {
        dau: dauRows[0]?.[0] ?? 0,
        wau: wauRows[0]?.[0] ?? 0,
        mau: mauRows[0]?.[0] ?? 0,
      };
      setCache(app, cacheKey, cached);
    }
    dau = cached.dau;
    wau = cached.wau;
    mau = cached.mau;
  } catch (err) {
    // Fallback: count from DB
    dau = await app.prisma.user.count({
      where: { matchesAsHome: { some: { createdAt: { gte: todayStart } } } },
    });
    wau = await app.prisma.user.count({
      where: { matchesAsHome: { some: { createdAt: { gte: sevenDaysAgo } } } },
    });
    mau = await app.prisma.user.count({
      where: { matchesAsHome: { some: { createdAt: { gte: thirtyDaysAgo } } } },
    });
  }

  return { totalUsers, newUsersToday, newUsers7d, newUsers30d, dau, wau, mau };
}

export async function getRetentionMetrics(app: FastifyInstance): Promise<RetentionMetrics> {
  try {
    const cacheKey = "ph:retention";
    let cached = getCache(app, cacheKey);
    if (!cached) {
      // PostHog: retention query — users who came back on D1, D7, D30
      // We query PostHog insights-style retention
      const [d1Rows, d7Rows, d30Rows] = await Promise.all([
        queryPosthog(`
          SELECT
            count(distinct distinct_id) FILTER (WHERE timestamp >= addDays(now(), -2) AND timestamp < addDays(now(), -1)) AS cohort,
            count(distinct distinct_id) FILTER (WHERE timestamp >= addDays(now(), -1)) AS returned
          FROM events
          WHERE event = 'app_opened'
            AND timestamp >= addDays(now(), -2)
        `),
        queryPosthog(`
          SELECT
            count(distinct distinct_id) FILTER (WHERE timestamp >= addDays(now(), -8) AND timestamp < addDays(now(), -7)) AS cohort,
            count(distinct distinct_id) FILTER (WHERE timestamp >= addDays(now(), -7)) AS returned
          FROM events
          WHERE event = 'app_opened'
            AND timestamp >= addDays(now(), -8)
        `),
        queryPosthog(`
          SELECT
            count(distinct distinct_id) FILTER (WHERE timestamp >= addDays(now(), -31) AND timestamp < addDays(now(), -30)) AS cohort,
            count(distinct distinct_id) FILTER (WHERE timestamp >= addDays(now(), -30)) AS returned
          FROM events
          WHERE event = 'app_opened'
            AND timestamp >= addDays(now(), -31)
        `),
      ]);

      const calcRet = (row: any[] | undefined): number => {
        if (!row || row.length === 0) return 0;
        const cohort = Number(row[0]?.[0] ?? 0);
        const returned = Number(row[0]?.[1] ?? 0);
        return cohort > 0 ? Math.round((returned / cohort) * 100) : 0;
      };

      cached = {
        d1: calcRet(d1Rows),
        d7: calcRet(d7Rows),
        d30: calcRet(d30Rows),
      };
      setCache(app, cacheKey, cached);
    }
    return cached;
  } catch (err) {
    // Fallback: return 0s
    return { d1: 0, d7: 0, d30: 0 };
  }
}

export async function getActivityMetrics(app: FastifyInstance): Promise<ActivityMetrics> {
  const totalUsers = await app.prisma.user.count();
  const totalMatches = await app.prisma.match.count();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [matchesLast30d, usersWithAnyMatch] = await Promise.all([
    app.prisma.match.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    app.prisma.match.findMany({
      where: { isBot: false },
      select: { homeUserId: true, awayUserId: true },
    }),
  ]);

  const userIds = new Set<string>();
  for (const m of usersWithAnyMatch) {
    if (m.homeUserId) userIds.add(m.homeUserId);
    if (m.awayUserId) userIds.add(m.awayUserId);
  }
  const usersWithMatch = userIds.size;

  return {
    avgMatchesPerUser: parseFloat((totalUsers > 0 ? totalMatches / totalUsers : 0).toFixed(2)),
    avgSessionsPerUser: parseFloat((totalUsers > 0 ? totalMatches / totalUsers : 0).toFixed(2)),
    avgSessionDurationSec: 600, // approximate 10 min per match
    avgMatchesPerDay: parseFloat((matchesLast30d / 30).toFixed(2)),
    percentUsersPlayedMatch: totalUsers > 0 ? Math.round((usersWithMatch / totalUsers) * 100) : 0,
  };
}

export async function getScoutingStats(app: FastifyInstance): Promise<ScoutingStats> {
  const scouts = await app.prisma.scout.findMany({
    include: {
      results: true,
      user: { select: { id: true, username: true } },
    },
  });

  const totalOpens = scouts.reduce((sum, s) => sum + s.results.length, 0);
  const totalRevenueTon = scouts
    .filter((s) => s.costCurrency === "TON")
    .reduce((sum, s) => sum + s.cost, 0);

  const setMap = new Map<string, { label: string; opens: number; purchases: number }>();
  for (const s of scouts) {
    const existing = setMap.get(s.tier) || { label: s.tier, opens: 0, purchases: 0 };
    existing.opens += s.results.length;
    existing.purchases += s.status === "COLLECTED" ? 1 : 0;
    setMap.set(s.tier, existing);
  }

  const buyerMap = new Map<string, { userId: string; username: string | null; spentTon: number }>();
  for (const s of scouts) {
    if (s.costCurrency === "TON" && s.user) {
      const existing = buyerMap.get(s.user.id) || {
        userId: s.user.id,
        username: s.user.username,
        spentTon: 0,
      };
      existing.spentTon += s.cost;
      buyerMap.set(s.user.id, existing);
    }
  }

  return {
    totalRevenueTon,
    totalOpens,
    bySet: Array.from(setMap.values()),
    topBuyers: Array.from(buyerMap.values())
      .sort((a, b) => b.spentTon - a.spentTon)
      .slice(0, 10),
  };
}

export async function getNftStats(app: FastifyInstance): Promise<NftStats> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalMinted, last24h, last7d] = await Promise.all([
    app.prisma.player.count({ where: { isNft: true } }),
    app.prisma.player.count({ where: { isNft: true, mintedAt: { gte: yesterday } } }),
    app.prisma.player.count({ where: { isNft: true, mintedAt: { gte: sevenDaysAgo } } }),
  ]);

  return { totalMinted, last24h, last7d };
}

export async function getTopUsers(app: FastifyInstance, metric: string, limit: number) {
  const orderBy: any = {};
  if (metric === "coins") orderBy.coins = "desc";
  else if (metric === "points") orderBy.points = "desc";
  else if (metric === "level") orderBy.level = "desc";
  else orderBy.coins = "desc";

  return app.prisma.user.findMany({
    orderBy,
    take: Math.min(limit, 100),
    select: {
      id: true,
      telegramId: true,
      username: true,
      firstName: true,
      coins: true,
      points: true,
      level: true,
      isAdmin: true,
      isBanned: true,
      createdAt: true,
    },
  });
}

export async function getUserDetail(app: FastifyInstance, userId: string) {
  const user = await app.prisma.user.findUnique({
    where: { id: userId },
    include: {
      teams: {
        include: {
          players: { include: { player: true } },
        },
      },
    },
  });
  if (!user) return null;
  return {
    ...user,
    country: null,
    tonWallet: null,
  };
}
