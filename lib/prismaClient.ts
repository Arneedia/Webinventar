import 'dotenv/config';
import Database from 'better-sqlite3';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from './generated/prisma/client';
import path from 'path';

// PrismaClient als Singleton, um Verbindungsprobleme in Next.js (Hot Reload) zu vermeiden
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
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
