/**
 * Migration Script: SQLite (dev.db) → Vercel Postgres
 * 
 * Dieses Script liest alle Daten aus der lokalen SQLite-Datenbank
 * und schreibt sie in die Vercel Postgres-Datenbank.
 */

import Database from 'better-sqlite3';
import { Client } from 'pg';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const SQLITE_PATH = path.join(__dirname, '../prisma/dev.db');
const POSTGRES_URL = process.env.POSTGRES_URL;

if (!POSTGRES_URL) {
  console.error('❌ POSTGRES_URL nicht in .env gefunden!');
  process.exit(1);
}

// Tabellen in der richtigen Reihenfolge (wegen Foreign Keys)
const TABLES_ORDER = [
  // Stammdaten ohne Abhängigkeiten
  { sqlite: 'ABT', postgres: 'ABT', idColumn: 'ABTID' },
  { sqlite: 'STAT', postgres: 'STAT', idColumn: 'StatusID' },
  { sqlite: 'GS', postgres: 'GS', idColumn: 'GSID' },
  { sqlite: 'HW', postgres: 'HW', idColumn: 'HWID' },
  { sqlite: 'HS', postgres: 'HS', idColumn: 'HSID' },
  { sqlite: 'MOD', postgres: 'MOD', idColumn: 'ModID' },
  { sqlite: 'RAUM', postgres: 'RAUM', idColumn: 'RaumID' },
  { sqlite: 'ZT', postgres: 'ZT', idColumn: 'ID' },
  
  // Benutzer (abhängig von ABT, STAT, GS)
  { sqlite: 'Benutzer', postgres: 'Benutzer', idColumn: 'BenutzerID' },
  
  // Geräte (abhängig von HW, HS, MOD, RAUM)
  { sqlite: 'GER', postgres: 'GER', idColumn: 'GerID' },
  
  // Zuordnungstabellen
  { sqlite: 'HW_HS', postgres: 'HW_HS', idColumn: null },
  { sqlite: 'HS_MOD', postgres: 'HS_MOD', idColumn: null },
  
  // Zubehör (abhängig von ZT, HW, MOD, HS)
  { sqlite: 'Zubehör', postgres: 'Zubehör', idColumn: 'ZubehoerID' },
  
  // Benutzer-Geräte Zuordnung
  { sqlite: 'BenutzerGER', postgres: 'BenutzerGER', idColumn: 'ID' },
  
  // Zubehör-Zuordnungen
  { sqlite: 'ZubehörBenutzer', postgres: 'ZubehörBenutzer', idColumn: 'ID' },
  { sqlite: 'ZubehörInventar', postgres: 'ZubehörInventar', idColumn: 'InventarID' },
  { sqlite: 'ZubehörBewegung', postgres: 'ZubehörBewegung', idColumn: 'ID' },
  
  // Web-User und Sessions
  { sqlite: 'WebUser', postgres: 'WebUser', idColumn: 'id' },
  { sqlite: 'PermissionGroup', postgres: 'PermissionGroup', idColumn: 'id' },
  { sqlite: 'WebUserPermissionGroup', postgres: 'WebUserPermissionGroup', idColumn: 'id' },
  { sqlite: 'Session', postgres: 'Session', idColumn: 'id' },
];

async function migrate() {
  console.log('🚀 Starte Migration SQLite → Vercel Postgres\n');
  
  // SQLite verbinden
  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  console.log('✅ SQLite verbunden:', SQLITE_PATH);
  
  // Postgres verbinden
  const pg = new Client({ connectionString: POSTGRES_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  console.log('✅ Postgres verbunden\n');
  
  try {
    // Zuerst alle Tabellen in Postgres erstellen (Schema muss existieren)
    console.log('📋 Prüfe ob Schema existiert...');
    
    for (const table of TABLES_ORDER) {
      await migrateTable(sqlite, pg, table);
    }
    
    console.log('\n✅ Migration erfolgreich abgeschlossen!');
    
  } catch (error) {
    console.error('\n❌ Fehler bei Migration:', error);
    throw error;
  } finally {
    sqlite.close();
    await pg.end();
  }
}

async function migrateTable(
  sqlite: Database.Database, 
  pg: Client, 
  table: { sqlite: string; postgres: string; idColumn: string | null }
) {
  try {
    // Daten aus SQLite lesen
    const rows = sqlite.prepare(`SELECT * FROM "${table.sqlite}"`).all() as Record<string, unknown>[];
    
    if (rows.length === 0) {
      console.log(`⏭️  ${table.sqlite}: Keine Daten`);
      return;
    }
    
    console.log(`📦 ${table.sqlite}: ${rows.length} Datensätze...`);
    
    // Spalten ermitteln
    const columns = Object.keys(rows[0]);
    
    // Für jeden Datensatz INSERT ausführen
    for (const row of rows) {
      const values = columns.map(col => row[col]);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const columnNames = columns.map(c => `"${c}"`).join(', ');
      
      const query = `INSERT INTO "${table.postgres}" (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
      
      try {
        await pg.query(query, values);
      } catch (err: unknown) {
        const error = err as Error;
        // Bei Duplikaten ignorieren
        if (!error.message.includes('duplicate') && !error.message.includes('already exists')) {
          console.error(`  ⚠️ Fehler bei Zeile:`, error.message);
        }
      }
    }
    
    // Sequence zurücksetzen wenn ID-Spalte existiert
    if (table.idColumn) {
      try {
        const maxIdResult = sqlite.prepare(`SELECT MAX("${table.idColumn}") as maxId FROM "${table.sqlite}"`).get() as { maxId: number } | undefined;
        if (maxIdResult?.maxId) {
          const seqName = `"${table.postgres}_${table.idColumn}_seq"`;
          await pg.query(`SELECT setval(${seqName}, $1, true)`, [maxIdResult.maxId]);
        }
      } catch {
        // Sequence existiert möglicherweise nicht - ignorieren
      }
    }
    
    console.log(`   ✅ ${rows.length} Datensätze migriert`);
    
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message.includes('no such table')) {
      console.log(`⏭️  ${table.sqlite}: Tabelle existiert nicht in SQLite`);
    } else if (error.message.includes('does not exist')) {
      console.log(`⏭️  ${table.sqlite}: Tabelle existiert nicht in Postgres (Schema fehlt?)`);
    } else {
      console.error(`❌ ${table.sqlite}: ${error.message}`);
    }
  }
}

migrate().catch(console.error);
