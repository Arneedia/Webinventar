/**
 * Setzt die ID-Sequenzen für BenutzerGER und ZubehörBenutzer zurück,
 * um P2002 (Unique constraint) Fehler zu beheben.
 *
 * Ausführen: npx tsx scripts/fix-sequences.ts
 */

import 'dotenv/config';

const isPostgres = () => {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
  return url.startsWith('postgres');
};

async function fixPostgresSequences() {
  const { Pool } = await import('pg');
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    // BenutzerGER
    await client.query(`
      SELECT setval('"BenutzerGER_ID_seq"', (SELECT COALESCE(MAX("ID"),0)+1 FROM "BenutzerGER"), false);
    `);
    console.log('✓ BenutzerGER_ID_seq zurückgesetzt');

    // ZubehörBenutzer
    await client.query(`
      SELECT setval('"ZubehörBenutzer_ID_seq"', (SELECT COALESCE(MAX("ID"),0)+1 FROM "ZubehörBenutzer"), false);
    `);
    console.log('✓ ZubehörBenutzer_ID_seq zurückgesetzt');

    console.log('\nSequenzen erfolgreich korrigiert!');
  } finally {
    client.release();
    await pool.end();
  }
}

async function fixSqliteSequences() {
  const Database = (await import('better-sqlite3')).default;
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
  const dbPath = url.replace(/^file:/, '');
  const db = new Database(dbPath);

  // BenutzerGER
  db.exec(`
    UPDATE sqlite_sequence
    SET seq = (SELECT COALESCE(MAX("ID"),0) FROM "BenutzerGER")
    WHERE name='BenutzerGER';
  `);
  console.log('✓ BenutzerGER Sequenz zurückgesetzt');

  // ZubehörBenutzer
  db.exec(`
    UPDATE sqlite_sequence
    SET seq = (SELECT COALESCE(MAX("ID"),0) FROM "ZubehörBenutzer")
    WHERE name='ZubehörBenutzer';
  `);
  console.log('✓ ZubehörBenutzer Sequenz zurückgesetzt');

  db.close();
  console.log('\nSequenzen erfolgreich korrigiert!');
}

async function main() {
  console.log('Korrigiere ID-Sequenzen...\n');

  if (isPostgres()) {
    console.log('Erkannt: PostgreSQL\n');
    await fixPostgresSequences();
  } else {
    console.log('Erkannt: SQLite\n');
    await fixSqliteSequences();
  }
}

main().catch((err) => {
  console.error('Fehler:', err);
  process.exit(1);
});
