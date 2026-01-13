#!/usr/bin/env tsx
/**
 * Test-Script für Datenbankverbindung
 * Verwendung: tsx scripts/test-db-connection.ts
 */

import 'dotenv/config';
import { prisma } from '../lib/prismaClient';

async function testConnection() {
  console.log('=== Datenbankverbindung testen ===\n');
  
  console.log('Umgebungsvariablen:');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- DATABASE_URL vorhanden:', !!process.env.DATABASE_URL);
  console.log('- POSTGRES_URL vorhanden:', !!process.env.POSTGRES_URL);
  console.log('');

  try {
    console.log('1. Teste Prisma-Verbindung...');
    await prisma.$connect();
    console.log('✓ Prisma verbunden\n');

    console.log('2. Teste einfache Query (WebUser count)...');
    const userCount = await prisma.webUser.count();
    console.log(`✓ Anzahl WebUser: ${userCount}\n`);

    console.log('3. Teste Session-Query...');
    const sessionCount = await prisma.session.count();
    console.log(`✓ Anzahl Sessions: ${sessionCount}\n`);

    console.log('4. Teste komplexe Query (User mit Permissions)...');
    const users = await prisma.webUser.findMany({
      take: 1,
      include: {
        permissionGroups: {
          include: { permissionGroup: true },
        },
      },
    });
    console.log(`✓ Erste User geladen: ${users[0]?.email || 'keine'}\n`);

    console.log('=== ALLE TESTS ERFOLGREICH ===');
  } catch (error) {
    console.error('\n❌ FEHLER:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
