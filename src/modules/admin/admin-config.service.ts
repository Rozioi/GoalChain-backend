import { FastifyInstance } from "fastify";

const DEFAULT_CONFIGS: Record<string, string> = {
  MAINTENANCE_MODE: "false",
  MAINTENANCE_MESSAGE: "Server is under maintenance. Please check back later.",
};

export async function getConfig(app: FastifyInstance, key: string): Promise<string | null> {
  const row = await app.prisma.appConfig.findUnique({ where: { key } });
  return row?.value ?? DEFAULT_CONFIGS[key] ?? null;
}

export async function getConfigs(app: FastifyInstance): Promise<Record<string, string>> {
  const rows = await app.prisma.appConfig.findMany();
  const result: Record<string, string> = { ...DEFAULT_CONFIGS };
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

export async function setConfig(app: FastifyInstance, key: string, value: string): Promise<void> {
  await app.prisma.appConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}
