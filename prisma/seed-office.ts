import { prisma } from '../lib/prismaClient';

async function main() {
  console.log('🌱 Seeding Büroinventar...');

  // Kategorien erstellen
  const kategorien = await Promise.all([
    prisma.bueroKategorie.upsert({
      where: { Name: 'Schreibtische' },
      update: {},
      create: {
        Name: 'Schreibtische',
        Beschreibung: 'Höhenverstellbare und normale Schreibtische',
      },
    }),
    prisma.bueroKategorie.upsert({
      where: { Name: 'Bürostühle' },
      update: {},
      create: {
        Name: 'Bürostühle',
        Beschreibung: 'Ergonomische Bürostühle und Drehstühle',
      },
    }),
    prisma.bueroKategorie.upsert({
      where: { Name: 'Schränke' },
      update: {},
      create: {
        Name: 'Schränke',
        Beschreibung: 'Aktenschränke, Rollcontainer und Regale',
      },
    }),
    prisma.bueroKategorie.upsert({
      where: { Name: 'Beleuchtung' },
      update: {},
      create: {
        Name: 'Beleuchtung',
        Beschreibung: 'Schreibtischlampen und Stehleuchten',
      },
    }),
    prisma.bueroKategorie.upsert({
      where: { Name: 'Besprechungstische' },
      update: {},
      create: {
        Name: 'Besprechungstische',
        Beschreibung: 'Konferenztische und Besprechungsmöbel',
      },
    }),
  ]);

  console.log(`✅ ${kategorien.length} Kategorien erstellt`);

  // Testdaten für Inventar
  const inventarItems = [
    // Schreibtische
    {
      KategorieID: kategorien[0].ID,
      Bezeichnung: 'Höhenverstellbarer Schreibtisch',
      Beschreibung: 'Elektrisch höhenverstellbar, 160x80cm',
      InventarNr: 'DESK-001',
      Seriennummer: 'HV-2024-001',
      Hersteller: 'Ikea',
      Modell: 'BEKANT',
      Anschaffungsdatum: new Date('2024-01-15'),
      Anschaffungspreis: 449.00,
      Zustand: 'GUT',
      Notiz: 'Elektrische Höhenverstellung funktioniert einwandfrei',
    },
    {
      KategorieID: kategorien[0].ID,
      Bezeichnung: 'Schreibtisch Standard',
      Beschreibung: 'Feste Höhe, 140x70cm',
      InventarNr: 'DESK-002',
      Hersteller: 'Ikea',
      Modell: 'LINNMON',
      Anschaffungsdatum: new Date('2023-06-10'),
      Anschaffungspreis: 89.99,
      Zustand: 'GUT',
    },
    {
      KategorieID: kategorien[0].ID,
      Bezeichnung: 'Eckschreibtisch',
      Beschreibung: 'L-Form, 180x160cm',
      InventarNr: 'DESK-003',
      Hersteller: 'Hammerbacher',
      Modell: 'XE19',
      Anschaffungsdatum: new Date('2024-03-20'),
      Anschaffungspreis: 329.00,
      Zustand: 'GUT',
    },
    // Bürostühle
    {
      KategorieID: kategorien[1].ID,
      Bezeichnung: 'Ergonomischer Bürostuhl',
      Beschreibung: 'Mit Lordosenstütze und Armlehnen',
      InventarNr: 'CHAIR-001',
      Seriennummer: 'ERG-2024-045',
      Hersteller: 'Steelcase',
      Modell: 'Gesture',
      Anschaffungsdatum: new Date('2024-02-01'),
      Anschaffungspreis: 899.00,
      Zustand: 'GUT',
      Notiz: 'Premium-Modell für Geschäftsführung',
    },
    {
      KategorieID: kategorien[1].ID,
      Bezeichnung: 'Bürostuhl Standard',
      Beschreibung: 'Drehstuhl mit Rollen',
      InventarNr: 'CHAIR-002',
      Hersteller: 'Topstar',
      Modell: 'Open Point SY',
      Anschaffungsdatum: new Date('2023-09-15'),
      Anschaffungspreis: 149.99,
      Zustand: 'GUT',
    },
    {
      KategorieID: kategorien[1].ID,
      Bezeichnung: 'Bürostuhl Standard',
      InventarNr: 'CHAIR-003',
      Hersteller: 'Topstar',
      Modell: 'Open Point SY',
      Anschaffungsdatum: new Date('2023-09-15'),
      Anschaffungspreis: 149.99,
      Zustand: 'BESCHAEDIGT',
      Notiz: 'Armlehne rechts gebrochen, Reparatur geplant',
    },
    // Schränke
    {
      KategorieID: kategorien[2].ID,
      Bezeichnung: 'Aktenschrank',
      Beschreibung: '4 Schubladen, abschließbar',
      InventarNr: 'CAB-001',
      Hersteller: 'Bisley',
      Modell: 'F Series',
      Anschaffungsdatum: new Date('2023-11-20'),
      Anschaffungspreis: 389.00,
      Zustand: 'GUT',
    },
    {
      KategorieID: kategorien[2].ID,
      Bezeichnung: 'Rollcontainer',
      Beschreibung: '3 Schubladen, mobil',
      InventarNr: 'CAB-002',
      Hersteller: 'Ikea',
      Modell: 'HELMER',
      Anschaffungsdatum: new Date('2024-01-10'),
      Anschaffungspreis: 59.99,
      Zustand: 'GUT',
    },
    {
      KategorieID: kategorien[2].ID,
      Bezeichnung: 'Bücherregal',
      Beschreibung: '5 Fächer, 80x200cm',
      InventarNr: 'CAB-003',
      Hersteller: 'Ikea',
      Modell: 'BILLY',
      Anschaffungsdatum: new Date('2023-07-05'),
      Anschaffungspreis: 79.99,
      Zustand: 'GUT',
    },
    // Beleuchtung
    {
      KategorieID: kategorien[3].ID,
      Bezeichnung: 'LED Schreibtischlampe',
      Beschreibung: 'Dimmbar, Farbtemperatur einstellbar',
      InventarNr: 'LAMP-001',
      Hersteller: 'BenQ',
      Modell: 'ScreenBar Plus',
      Anschaffungsdatum: new Date('2024-02-15'),
      Anschaffungspreis: 139.00,
      Zustand: 'GUT',
    },
    {
      KategorieID: kategorien[3].ID,
      Bezeichnung: 'Stehleuchte',
      Beschreibung: 'LED, höhenverstellbar',
      InventarNr: 'LAMP-002',
      Hersteller: 'Philips',
      Modell: 'myLiving',
      Anschaffungsdatum: new Date('2023-10-01'),
      Anschaffungspreis: 89.99,
      Zustand: 'GUT',
    },
    // Besprechungstische
    {
      KategorieID: kategorien[4].ID,
      Bezeichnung: 'Konferenztisch',
      Beschreibung: 'Für 8 Personen, 240x120cm',
      InventarNr: 'MEET-001',
      Hersteller: 'Hammerbacher',
      Modell: 'KT24',
      Anschaffungsdatum: new Date('2023-12-01'),
      Anschaffungspreis: 599.00,
      Zustand: 'GUT',
    },
    {
      KategorieID: kategorien[4].ID,
      Bezeichnung: 'Stehtisch Besprechung',
      Beschreibung: 'Höhe 110cm, 120x80cm',
      InventarNr: 'MEET-002',
      Hersteller: 'Ikea',
      Modell: 'UTBY',
      Anschaffungsdatum: new Date('2024-01-20'),
      Anschaffungspreis: 199.00,
      Zustand: 'GUT',
    },
  ];

  console.log('📦 Erstelle Inventar-Einträge...');

  for (const item of inventarItems) {
    const created = await prisma.bueroInventar.create({
      data: item,
    });

    // Bewegung: ZUGANG
    await prisma.bueroBewegung.create({
      data: {
        InventarID: created.ID,
        Typ: 'ZUGANG',
        Bemerkung: 'Erstanlage (Seed)',
      },
    });

    console.log(`  ✓ ${item.Bezeichnung} (${item.InventarNr})`);
  }

  console.log(`\n✅ ${inventarItems.length} Inventar-Einträge erstellt`);
  console.log('🎉 Seeding abgeschlossen!\n');
}

main()
  .catch((e) => {
    console.error('❌ Fehler beim Seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
