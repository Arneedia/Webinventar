require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  ssl: false,
});

async function main() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Seeding Büroinventar...\n');

    // Kategorien
    console.log('📁 Erstelle Kategorien...');
    await client.query(`
      INSERT INTO "BueroKategorie" ("Name", "Beschreibung") VALUES
      ('Schreibtische', 'Höhenverstellbare und normale Schreibtische'),
      ('Bürostühle', 'Ergonomische Bürostühle und Drehstühle'),
      ('Schränke', 'Aktenschränke, Rollcontainer und Regale'),
      ('Beleuchtung', 'Schreibtischlampen und Stehleuchten'),
      ('Besprechungstische', 'Konferenztische und Besprechungsmöbel')
      ON CONFLICT ("Name") DO NOTHING
    `);
    console.log('  ✓ 5 Kategorien erstellt\n');

    // Inventar-Einträge
    console.log('📦 Erstelle Inventar-Einträge...');
    
    const items = [
      ['Schreibtische', 'Höhenverstellbarer Schreibtisch', 'Elektrisch höhenverstellbar, 160x80cm', 'DESK-001', 'HV-2024-001', 'Ikea', 'BEKANT', '2024-01-15', 449.00, 'GUT', 'Elektrische Höhenverstellung funktioniert einwandfrei'],
      ['Schreibtische', 'Schreibtisch Standard', 'Feste Höhe, 140x70cm', 'DESK-002', null, 'Ikea', 'LINNMON', '2023-06-10', 89.99, 'GUT', null],
      ['Schreibtische', 'Eckschreibtisch', 'L-Form, 180x160cm', 'DESK-003', null, 'Hammerbacher', 'XE19', '2024-03-20', 329.00, 'GUT', null],
      ['Bürostühle', 'Ergonomischer Bürostuhl', 'Mit Lordosenstütze und Armlehnen', 'CHAIR-001', 'ERG-2024-045', 'Steelcase', 'Gesture', '2024-02-01', 899.00, 'GUT', 'Premium-Modell für Geschäftsführung'],
      ['Bürostühle', 'Bürostuhl Standard', 'Drehstuhl mit Rollen', 'CHAIR-002', null, 'Topstar', 'Open Point SY', '2023-09-15', 149.99, 'GUT', null],
      ['Bürostühle', 'Bürostuhl Standard', null, 'CHAIR-003', null, 'Topstar', 'Open Point SY', '2023-09-15', 149.99, 'BESCHAEDIGT', 'Armlehne rechts gebrochen, Reparatur geplant'],
      ['Schränke', 'Aktenschrank', '4 Schubladen, abschließbar', 'CAB-001', null, 'Bisley', 'F Series', '2023-11-20', 389.00, 'GUT', null],
      ['Schränke', 'Rollcontainer', '3 Schubladen, mobil', 'CAB-002', null, 'Ikea', 'HELMER', '2024-01-10', 59.99, 'GUT', null],
      ['Schränke', 'Bücherregal', '5 Fächer, 80x200cm', 'CAB-003', null, 'Ikea', 'BILLY', '2023-07-05', 79.99, 'GUT', null],
      ['Beleuchtung', 'LED Schreibtischlampe', 'Dimmbar, Farbtemperatur einstellbar', 'LAMP-001', null, 'BenQ', 'ScreenBar Plus', '2024-02-15', 139.00, 'GUT', null],
      ['Beleuchtung', 'Stehleuchte', 'LED, höhenverstellbar', 'LAMP-002', null, 'Philips', 'myLiving', '2023-10-01', 89.99, 'GUT', null],
      ['Besprechungstische', 'Konferenztisch', 'Für 8 Personen, 240x120cm', 'MEET-001', null, 'Hammerbacher', 'KT24', '2023-12-01', 599.00, 'GUT', null],
      ['Besprechungstische', 'Stehtisch Besprechung', 'Höhe 110cm, 120x80cm', 'MEET-002', null, 'Ikea', 'UTBY', '2024-01-20', 199.00, 'GUT', null],
    ];

    for (const item of items) {
      const [kategorie, bezeichnung, beschreibung, inventarNr, seriennummer, hersteller, modell, datum, preis, zustand, notiz] = item;
      
      const result = await client.query(`
        INSERT INTO "BueroInventar" 
        ("KategorieID", "Bezeichnung", "Beschreibung", "InventarNr", "Seriennummer", "Hersteller", "Modell", "Anschaffungsdatum", "Anschaffungspreis", "Zustand", "Notiz", "createdAt", "updatedAt")
        SELECT 
          (SELECT "ID" FROM "BueroKategorie" WHERE "Name" = $1),
          $2, $3, $4, $5, $6, $7, $8::timestamp, $9, $10, $11, NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM "BueroInventar" WHERE "InventarNr" = $4)
        RETURNING "ID"
      `, [kategorie, bezeichnung, beschreibung, inventarNr, seriennummer, hersteller, modell, datum, preis, zustand, notiz]);
      
      if (result.rows.length > 0) {
        console.log(`  ✓ ${bezeichnung} (${inventarNr})`);
      }
    }

    console.log('\n✅ Seeding abgeschlossen!');
    console.log('🎉 Öffne http://localhost:3000/bueroinventar um die Daten zu sehen\n');
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
