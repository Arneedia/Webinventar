import 'dotenv/config';
import { PrismaClient } from './generated/prisma/client';
import path from 'path';

// PrismaClient als Singleton, um Verbindungsprobleme in Next.js (Hot Reload) zu vermeiden
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  // Prüfe ob Prisma Postgres URL vorhanden (Vercel Produktion)
  const prismaDbUrl = process.env.PRISMA_DATABASE_URL;
  
  if (prismaDbUrl && prismaDbUrl.startsWith('prisma+postgres://')) {
    // Vercel Prisma Postgres - nutze den libSQL/Prisma Postgres Adapter
    const { PrismaPg } = require('@prisma/adapter-pg');
    const { Pool } = require('pg');
    
    // Extrahiere die echte Postgres URL aus der Prisma URL
    const postgresUrl = process.env.POSTGRES_URL;
    if (!postgresUrl) {
      throw new Error('POSTGRES_URL muss für Prisma Postgres gesetzt sein');
    }
    
    const pool = new Pool({ connectionString: postgresUrl, ssl: { rejectUnauthorized: false } });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }
  
  // Lokale Entwicklung mit SQLite
  const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
  const url = process.env.DATABASE_URL || 'file:./prisma/dev.db';
  
  let filePath: string;
  if (url.startsWith('file:')) {
    filePath = url.replace(/^file:/, '');
  } else {
    filePath = url;
  }

  // Absoluten Pfad verwenden
  const absolutePath = path.isAbsolute(filePath) 
    ? filePath 
    : path.join(process.cwd(), filePath);

  const adapter = new PrismaBetterSqlite3({ url: absolutePath });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
