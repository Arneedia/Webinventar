require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  ssl: false,
});

async function main() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Erstelle Büroinventar-Tabellen direkt...\n');

    // Tabellen erstellen
    await client.query(`
      -- Kategorien-Tabelle
      CREATE TABLE IF NOT EXISTS "BueroKategorie" (
        "ID" SERIAL PRIMARY KEY,
        "Name" TEXT UNIQUE NOT NULL,
        "Beschreibung" TEXT
      );

      -- Inventar-Tabelle
      CREATE TABLE IF NOT EXISTS "BueroInventar" (
        "ID" SERIAL PRIMARY KEY,
        "KategorieID" INTEGER NOT NULL REFERENCES "BueroKategorie"("ID"),
        "Bezeichnung" TEXT NOT NULL,
        "Beschreibung" TEXT,
        "InventarNr" TEXT UNIQUE,
        "Seriennummer" TEXT,
        "Hersteller" TEXT,
        "Modell" TEXT,
        "Anschaffungsdatum" TIMESTAMP,
        "Anschaffungspreis" DECIMAL(10,2),
        "Zustand" TEXT,
        "RaumID" INTEGER REFERENCES "RAUM"("RaumID"),
        "BenutzerID" INTEGER REFERENCES "Benutzer"("BenutzerID"),
        "Notiz" TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );

      -- Bewegungen-Tabelle
      CREATE TABLE IF NOT EXISTS "BueroBewegung" (
        "ID" SERIAL PRIMARY KEY,
        "InventarID" INTEGER NOT NULL REFERENCES "BueroInventar"("ID"),
        "Typ" TEXT NOT NULL,
        "VonBenutzerID" INTEGER REFERENCES "Benutzer"("BenutzerID"),
        "NachBenutzerID" INTEGER REFERENCES "Benutzer"("BenutzerID"),
        "VonRaumID" INTEGER REFERENCES "RAUM"("RaumID"),
        "NachRaumID" INTEGER REFERENCES "RAUM"("RaumID"),
        "Bemerkung" TEXT,
        "Zeitpunkt" TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ Tabellen erfolgreich erstellt!\n');

    // Testdaten einfügen
    console.log('📦 Füge Testdaten ein...\n');

    // Kategorien
    await client.query(`
      INSERT INTO "BueroKategorie" ("Name", "Beschreibung") VALUES
      ('Schreibtische', 'Höhenverstellbare und normale Schreibtische'),
      ('Bürostühle', 'Ergonomische Bürostühle und Drehstühle'),
      ('Schränke', 'Aktenschränke, Rollcontainer und Regale'),
      ('Beleuchtung', 'Schreibtischlampen und Stehleuchten'),
      ('Besprechungstische', 'Konferenztische und Besprechungsmöbel')
      ON CONFLICT ("Name") DO NOTHING
    `);

    // Inventar
    const items = [
      ['Schreibtische', 'Höhenverstellbarer Schreibtisch', 'Elektrisch höhenverstellbar, 160x80cm', 'DESK-001', 'HV-2024-001', 'Ikea', 'BEKANT', '2024-01-15', 449.00, 'GUT', 'Elektrische Höhenverstellung funktioniert einwandfrei'],
      ['Schreibtische', 'Schreibtisch Standard', 'Feste Höhe, 140x70cm', 'DESK-002', null, 'Ikea', 'LINNMON', '2023-06-10', 89.99, 'GUT', null],
      ['Schreibtische', 'Eckschreibtisch', 'L-Form, 180x160cm', 'DESK-003', null, 'Hammerbacher', 'XE19', '2024-03-20', 329.00, 'GUT', null],
      ['Bürostühle', 'Ergonomischer Bürostuhl', 'Mit Lordosenstütze und Armlehnen', 'CHAIR-001', 'ERG-2024-045', 'Steelcase', 'Gesture', '2024-02-01', 899.00, 'GUT', 'Premium-Modell'],
      ['Bürostühle', 'Bürostuhl Standard', 'Drehstuhl mit Rollen', 'CHAIR-002', null, 'Topstar', 'Open Point SY', '2023-09-15', 149.99, 'GUT', null],
      ['Bürostühle', 'Bürostuhl Standard', null, 'CHAIR-003', null, 'Topstar', 'Open Point SY', '2023-09-15', 149.99, 'BESCHAEDIGT', 'Armlehne rechts gebrochen'],
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
      
      await client.query(`
        INSERT INTO "BueroInventar" 
        ("KategorieID", "Bezeichnung", "Beschreibung", "InventarNr", "Seriennummer", "Hersteller", "Modell", "Anschaffungsdatum", "Anschaffungspreis", "Zustand", "Notiz")
        SELECT 
          (SELECT "ID" FROM "BueroKategorie" WHERE "Name" = $1),
          $2, $3, $4, $5, $6, $7, $8::timestamp, $9, $10, $11
        WHERE NOT EXISTS (SELECT 1 FROM "BueroInventar" WHERE "InventarNr" = $4)
      `, [kategorie, bezeichnung, beschreibung, inventarNr, seriennummer, hersteller, modell, datum, preis, zustand, notiz]);
      
      console.log(`  ✓ ${bezeichnung} (${inventarNr})`);
    }

    console.log('\n✅ Alle Daten erfolgreich eingefügt!');
    console.log('🎉 Öffne http://localhost:3000/bueroinventar\n');
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
