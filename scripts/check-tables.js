require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  ssl: false,
});

async function main() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'Buero%'
      ORDER BY table_name
    `);
    
    console.log('Büroinventar-Tabellen in der Datenbank:');
    if (result.rows.length === 0) {
      console.log('  ❌ Keine Tabellen gefunden!');
    } else {
      result.rows.forEach(row => {
        console.log(`  ✓ ${row.table_name}`);
      });
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}

main();
