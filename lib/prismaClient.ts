import 'dotenv/config';
import { PrismaClient } from './generated/prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

// PrismaClient als Singleton, um Verbindungsprobleme in Next.js (Hot Reload) zu vermeiden
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

function createPrismaClient() {
  // Auf Vercel: Verwende Prisma Accelerate mit der prisma+postgres URL
  // Lokal: Verwende direkte Postgres-Verbindung
  const isVercel = process.env.VERCEL === '1';
  const prismaUrl = process.env.PRISMA_DATABASE_URL;
  const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  
  if (isVercel && prismaUrl) {
    // Vercel Production: Prisma Accelerate
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = new PrismaClient({
      datasourceUrl: prismaUrl,
    } as any).$extends(withAccelerate());
    return client;
  }
  
  // Lokale Entwicklung oder Fallback: Direkter Postgres-Adapter
  if (!postgresUrl) {
    throw new Error('DATABASE_URL oder POSTGRES_URL muss gesetzt sein');
  }
  
  // Dynamischer Import für pg-Adapter (nur lokal benötigt)
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { Pool } = require('pg');
  
  const pool = new Pool({ 
    connectionString: postgresUrl, 
    ssl: { rejectUnauthorized: false } 
  });
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
