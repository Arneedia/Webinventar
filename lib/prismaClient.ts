import { PrismaClient } from '@prisma/client';

// PrismaClient als Singleton, um Verbindungsprobleme in Next.js (Hot Reload) zu vermeiden
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

  // Wenn eine SQLite-URL gesetzt ist, nutze den SQLite-Adapter (z.B. lokale Entwicklung)
  if (postgresUrl?.startsWith('file:')) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
    const adapter = new PrismaBetterSqlite3({ url: postgresUrl.replace(/^file:/, '') });
    return new PrismaClient({ adapter });
  }

  if (!postgresUrl) {
    throw new Error('DATABASE_URL oder POSTGRES_URL muss gesetzt sein');
  }

  // Postgres-Adapter (Produktion / Vercel)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaPg } = require('@prisma/adapter-pg');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Pool } = require('pg');

  const pool = new Pool({
    connectionString: postgresUrl,
    ssl: postgresUrl.includes('localhost') ? false : { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Cache Prisma Client in allen Umgebungen (nicht nur Development)
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}
