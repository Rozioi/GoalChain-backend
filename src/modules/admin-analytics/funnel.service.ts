import { FastifyInstance } from "fastify";
import crypto from "crypto";

interface FunnelStep {
  step: string;
  label: string;
  count: number;
}

interface FunnelResponse {
  id: string;
  name: string;
  link: string;
  createdAt: string;
  steps: FunnelStep[];
  totalClicks: number;
  tonRevenue: number;
}

const STEP_LABELS: Record<string, string> = {
  open: "Открыл Mini App",
  club_created: "Создал клуб",
  draft_started: "Начал драфт",
  draft_completed: "Завершил драфт",
  tutorial_match_started: "Начал обучающий матч",
  tutorial_match_completed: "Завершил обучающий матч",
  match_played: "Сыграл 1+ матчей",
  returned_d1: "Вернулся на D1",
  returned_d7: "Вернулся на D7",
};

export async function listFunnels(app: FastifyInstance): Promise<FunnelResponse[]> {
  const funnels = await app.prisma.adFunnel.findMany({
    include: {
      clicks: {
        select: { step: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const baseUrl = process.env.APP_URL || "https://t.me/GoalChainBot/app";

  return funnels.map((funnel) => {
    const stepCounts = new Map<string, number>();
    for (const click of funnel.clicks) {
      stepCounts.set(click.step, (stepCounts.get(click.step) || 0) + 1);
    }

    const steps: FunnelStep[] = Object.entries(STEP_LABELS).map(
      ([step, label]) => ({
        step,
        label,
        count: stepCounts.get(step) || 0,
      }),
    );

    const totalClicks = funnel.clicks.length;

    // Revenue tracking could be enhanced with actual TON data
    const tonRevenue = 0;

    return {
      id: funnel.id,
      name: funnel.name,
      link: `${baseUrl}?funnel=${funnel.trackingLink}`,
      createdAt: funnel.createdAt.toISOString(),
      steps,
      totalClicks,
      tonRevenue,
    };
  });
}

export async function createFunnel(app: FastifyInstance, name: string) {
  const trackingLink = crypto.randomBytes(8).toString("hex");

  const funnel = await app.prisma.adFunnel.create({
    data: { name, trackingLink },
  });

  const baseUrl = process.env.APP_URL || "https://t.me/GoalChainBot/app";

  return {
    id: funnel.id,
    name: funnel.name,
    link: `${baseUrl}?funnel=${funnel.trackingLink}`,
    trackingLink: funnel.trackingLink,
    createdAt: funnel.createdAt.toISOString(),
  };
}

export async function deleteFunnel(app: FastifyInstance, id: string) {
  await app.prisma.adFunnel.delete({ where: { id } });
}

export async function trackFunnelClick(
  app: FastifyInstance,
  trackingLink: string,
  step: string,
  telegramId?: string,
) {
  const funnel = await app.prisma.adFunnel.findUnique({
    where: { trackingLink },
  });

  if (!funnel) return;

  await app.prisma.adFunnelClick.create({
    data: {
      funnelId: funnel.id,
      telegramId,
      step,
    },
  });
}
