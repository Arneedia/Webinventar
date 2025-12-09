import 'dotenv/config';
import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// PrismaClient als Singleton, um Verbindungsprobleme in Next.js (Hot Reload) zu vermeiden
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  // Verwende immer den pg-Adapter mit direkter Postgres-Verbindung
  const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  
  if (!postgresUrl) {
    throw new Error('DATABASE_URL oder POSTGRES_URL muss gesetzt sein');
  }
  
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
