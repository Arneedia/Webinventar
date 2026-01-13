#!/usr/bin/env tsx
/**
 * Bereinigt abgelaufene Sessions
 * Verwendung: tsx scripts/cleanup-sessions.ts
 */

import 'dotenv/config';
import { prisma } from '../lib/prismaClient';

async function cleanupSessions() {
  console.log('=== Session Cleanup ===\n');
  
  try {
    const now = new Date();
    
    // Zähle Sessions
    const total = await prisma.session.count();
    const expired = await prisma.session.count({
      where: { expiresAt: { lt: now } }
    });
    const valid = await prisma.session.count({
      where: { expiresAt: { gt: now } }
    });
    
    console.log('Sessions vor Cleanup:');
    console.log('- Total:', total);
    console.log('- Abgelaufen:', expired);
    console.log('- Gültig:', valid);
    console.log('');
    
    if (expired > 0) {
      // Lösche abgelaufene Sessions
      const result = await prisma.session.deleteMany({
        where: { expiresAt: { lt: now } }
      });
      
      console.log(`✓ ${result.count} abgelaufene Sessions gelöscht\n`);
    } else {
      console.log('✓ Keine abgelaufenen Sessions gefunden\n');
    }
    
    // Zeige verbleibende Sessions
    const remaining = await prisma.session.findMany({
      include: {
        user: {
          select: { email: true }
        }
      },
      orderBy: { expiresAt: 'desc' }
    });
    
    console.log('Verbleibende Sessions:');
    if (remaining.length === 0) {
      console.log('- Keine Sessions vorhanden');
      console.log('\n⚠ HINWEIS: Alle Benutzer müssen sich neu anmelden!');
    } else {
      remaining.forEach((s: typeof remaining[0], i: number) => {
        const expiresIn = Math.round((s.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`${i + 1}. User: ${s.user.email}, Läuft ab in: ${expiresIn} Tagen`);
      });
    }
    
    console.log('\n=== CLEANUP ABGESCHLOSSEN ===');
  } catch (error) {
    console.error('\n❌ FEHLER:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupSessions();
