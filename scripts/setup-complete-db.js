require('dotenv').config();
const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  ssl: false,
});

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Komplettes Datenbank-Setup startet...\n');

    // 1. Admin-User erstellen
    console.log('👤 Erstelle Admin-User...');
    const adminPasswordHash = hashPassword('K22330k22330');
    
    await client.query(`
      INSERT INTO "WebUser" ("email", "name", "passwordHash", "role", "mustChangePassword", "createdAt", "updatedAt")
      VALUES ('admin@example.com', 'Administrator', $1, 'ADMIN', false, NOW(), NOW())
      ON CONFLICT ("email") DO UPDATE 
      SET "passwordHash" = $1, "mustChangePassword" = false, "updatedAt" = NOW()
    `, [adminPasswordHash]);
    
    console.log('  ✓ Admin-User: admin@example.com / K22330k22330\n');

    // 2. Geschäftsstellen
    console.log('🏢 Erstelle Geschäftsstellen...');
    await client.query(`
      INSERT INTO "GS" ("GSName", "GSStrasse", "GSHausNr", "GSPLZ", "GSOrt") VALUES
      ('Hauptstelle', 'Hauptstraße', '1', '10115', 'Berlin'),
      ('Filiale Nord', 'Nordweg', '42', '20095', 'Hamburg'),
      ('Filiale Süd', 'Südring', '15', '80331', 'München')
      ON CONFLICT DO NOTHING
    `);
    console.log('  ✓ 3 Geschäftsstellen\n');

    // 3. Abteilungen
    console.log('📋 Erstelle Abteilungen...');
    await client.query(`
      INSERT INTO "ABT" ("ABTName") VALUES
      ('IT-Abteilung'),
      ('Verwaltung'),
      ('Vertrieb'),
      ('Buchhaltung')
      ON CONFLICT DO NOTHING
    `);
    console.log('  ✓ 4 Abteilungen\n');

    // 4. Status
    console.log('📊 Erstelle Status...');
    await client.query(`
      INSERT INTO "STAT" ("StatusName") VALUES
      ('Aktiv'),
      ('Inaktiv'),
      ('Urlaub')
      ON CONFLICT DO NOTHING
    `);
    console.log('  ✓ 3 Status\n');

    // 5. Räume
    console.log('🚪 Erstelle Räume...');
    await client.query(`
      INSERT INTO "RAUM" ("RaumName", "Standort", "GSID") VALUES
      ('Büro 101', 'Erdgeschoss', (SELECT "GSID" FROM "GS" WHERE "GSName" = 'Hauptstelle' LIMIT 1)),
      ('Büro 201', '1. OG', (SELECT "GSID" FROM "GS" WHERE "GSName" = 'Hauptstelle' LIMIT 1)),
      ('Büro 301', '2. OG', (SELECT "GSID" FROM "GS" WHERE "GSName" = 'Hauptstelle' LIMIT 1)),
      ('Serverraum', 'Keller', (SELECT "GSID" FROM "GS" WHERE "GSName" = 'Hauptstelle' LIMIT 1))
      ON CONFLICT DO NOTHING
    `);
    console.log('  ✓ 4 Räume\n');

    // 6. Benutzer (Mitarbeiter)
    console.log('👥 Erstelle Mitarbeiter...');
    await client.query(`
      INSERT INTO "Benutzer" ("BenutzerName", "ABTID", "StatusID", "GSID", "RaumID") VALUES
      ('Max Mustermann', 
        (SELECT "ABTID" FROM "ABT" WHERE "ABTName" = 'IT-Abteilung' LIMIT 1),
        (SELECT "StatusID" FROM "STAT" WHERE "StatusName" = 'Aktiv' LIMIT 1),
        (SELECT "GSID" FROM "GS" WHERE "GSName" = 'Hauptstelle' LIMIT 1),
        (SELECT "RaumID" FROM "RAUM" WHERE "RaumName" = 'Büro 101' LIMIT 1)),
      ('Anna Schmidt',
        (SELECT "ABTID" FROM "ABT" WHERE "ABTName" = 'Verwaltung' LIMIT 1),
        (SELECT "StatusID" FROM "STAT" WHERE "StatusName" = 'Aktiv' LIMIT 1),
        (SELECT "GSID" FROM "GS" WHERE "GSName" = 'Hauptstelle' LIMIT 1),
        (SELECT "RaumID" FROM "RAUM" WHERE "RaumName" = 'Büro 201' LIMIT 1)),
      ('Peter Müller',
        (SELECT "ABTID" FROM "ABT" WHERE "ABTName" = 'Vertrieb' LIMIT 1),
        (SELECT "StatusID" FROM "STAT" WHERE "StatusName" = 'Aktiv' LIMIT 1),
        (SELECT "GSID" FROM "GS" WHERE "GSName" = 'Hauptstelle' LIMIT 1),
        (SELECT "RaumID" FROM "RAUM" WHERE "RaumName" = 'Büro 301' LIMIT 1))
      ON CONFLICT DO NOTHING
    `);
    console.log('  ✓ 3 Mitarbeiter\n');

    // 7. Hardware-Typen
    console.log('💻 Erstelle Hardware-Typen...');
    await client.query(`
      INSERT INTO "HW" ("HWName", "HWCode") VALUES
      ('Laptop', 'LAP'),
      ('Desktop', 'DES'),
      ('Monitor', 'MON'),
      ('Smartphone', 'PHO'),
      ('Tablet', 'TAB')
      ON CONFLICT ("HWCode") DO NOTHING
    `);
    console.log('  ✓ 5 Hardware-Typen\n');

    // 8. Hersteller
    console.log('🏭 Erstelle Hersteller...');
    await client.query(`
      INSERT INTO "HS" ("HSName") VALUES
      ('Dell'),
      ('Apple'),
      ('Lenovo'),
      ('Samsung'),
      ('HP')
      ON CONFLICT DO NOTHING
    `);
    console.log('  ✓ 5 Hersteller\n');

    // 9. Modelle
    console.log('📱 Erstelle Modelle...');
    await client.query(`
      INSERT INTO "MOD" ("ModName", "ModellNummer") VALUES
      ('Latitude 5420', 'LAT-5420'),
      ('MacBook Pro 14', 'MBP-14'),
      ('ThinkPad X1', 'TPX1'),
      ('Galaxy S23', 'GS23'),
      ('EliteBook 840', 'EB840')
      ON CONFLICT DO NOTHING
    `);
    console.log('  ✓ 5 Modelle\n');

    // 10. Büroinventar-Kategorien
    console.log('📁 Erstelle Büroinventar-Kategorien...');
    await client.query(`
      INSERT INTO "BueroKategorie" ("Name", "Beschreibung") VALUES
      ('Schreibtische', 'Höhenverstellbare und normale Schreibtische'),
      ('Bürostühle', 'Ergonomische Bürostühle und Drehstühle'),
      ('Schränke', 'Aktenschränke, Rollcontainer und Regale'),
      ('Beleuchtung', 'Schreibtischlampen und Stehleuchten'),
      ('Besprechungstische', 'Konferenztische und Besprechungsmöbel')
      ON CONFLICT ("Name") DO NOTHING
    `);
    console.log('  ✓ 5 Kategorien\n');

    // 11. Büroinventar
    console.log('🪑 Erstelle Büroinventar...');
    const bueroItems = [
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

    for (const item of bueroItems) {
      const [kategorie, bezeichnung, beschreibung, inventarNr, seriennummer, hersteller, modell, datum, preis, zustand, notiz] = item;
      
      await client.query(`
        INSERT INTO "BueroInventar" 
        ("KategorieID", "Bezeichnung", "Beschreibung", "InventarNr", "Seriennummer", "Hersteller", "Modell", "Anschaffungsdatum", "Anschaffungspreis", "Zustand", "Notiz")
        SELECT 
          (SELECT "ID" FROM "BueroKategorie" WHERE "Name" = $1),
          $2, $3, $4, $5, $6, $7, $8::timestamp, $9, $10, $11
        WHERE NOT EXISTS (SELECT 1 FROM "BueroInventar" WHERE "InventarNr" = $4)
      `, [kategorie, bezeichnung, beschreibung, inventarNr, seriennummer, hersteller, modell, datum, preis, zustand, notiz]);
    }
    console.log(`  ✓ ${bueroItems.length} Inventar-Einträge\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Datenbank-Setup erfolgreich abgeschlossen!\n');
    console.log('📊 Zusammenfassung:');
    console.log('  • 1 Admin-User (admin@example.com / K22330k22330)');
    console.log('  • 3 Geschäftsstellen');
    console.log('  • 4 Abteilungen');
    console.log('  • 4 Räume');
    console.log('  • 3 Mitarbeiter');
    console.log('  • 5 Hardware-Typen');
    console.log('  • 5 Hersteller');
    console.log('  • 5 Modelle');
    console.log('  • 5 Büroinventar-Kategorien');
    console.log('  • 13 Büroinventar-Einträge\n');
    console.log('🌐 Öffne: http://localhost:3000/login');
    console.log('═══════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Fehler:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
