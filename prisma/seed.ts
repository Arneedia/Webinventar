import 'dotenv/config';
import { randomBytes, scryptSync } from 'crypto';
import { prisma } from '../lib/prismaClient';

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function seedReferenceData() {
  if ((await prisma.aBT.count()) === 0) {
    await prisma.aBT.createMany({
      data: [
        { ABTName: 'IT-Abteilung' },
        { ABTName: 'Einkauf' },
        { ABTName: 'Vertrieb' },
        { ABTName: 'Personal' },
        { ABTName: 'Buchhaltung' },
      ],
    });
  }

  if ((await prisma.sTAT.count()) === 0) {
    await prisma.sTAT.createMany({
      data: [
        { StatusName: 'Aktiv' },
        { StatusName: 'Inaktiv' },
        { StatusName: 'Extern' },
        { StatusName: 'Elternzeit' },
      ],
    });
  }

  if ((await prisma.gS.count()) === 0) {
    await prisma.gS.createMany({
      data: [
        { GSName: 'Zentrale Berlin', GSOrt: 'Berlin', GSPLZ: '10115', GSStrasse: 'Invalidenstraße', GSHausNr: '117' },
        { GSName: 'Logistik Hamburg', GSOrt: 'Hamburg', GSPLZ: '20095', GSStrasse: 'Speicherstadt', GSHausNr: '5' },
        { GSName: 'Vertrieb München', GSOrt: 'München', GSPLZ: '80331', GSStrasse: 'Marienplatz', GSHausNr: '1' },
      ],
    });
  }

  // Räume (Stammdaten für Geräte-Standorte)
  if ((await prisma.rAUM.count()) === 0) {
    await prisma.rAUM.createMany({
      data: [
        { RaumName: 'IT-Lager', Standort: 'EG', Notiz: 'Hauptlager für IT-Geräte' },
        { RaumName: 'Serverraum', Standort: 'UG', Notiz: 'Klimatisiert' },
        { RaumName: 'Empfang', Standort: 'EG', Notiz: 'Leihgeräte' },
        { RaumName: 'Konferenzraum A', Standort: '1.OG', Notiz: null },
        { RaumName: 'Konferenzraum B', Standort: '1.OG', Notiz: null },
        { RaumName: 'Schulungsraum', Standort: '2.OG', Notiz: 'Schulungsgeräte' },
        { RaumName: 'Werkstatt', Standort: 'EG', Notiz: 'Reparaturgeräte' },
      ],
    });
  }

  if ((await prisma.hW.count()) === 0) {
    await prisma.hW.createMany({
      data: [
        { HWName: 'Laptop', HWCode: 'NB' },
        { HWName: 'Smartphone', HWCode: 'SP' },
        { HWName: 'Tablet', HWCode: 'TB' },
        { HWName: 'Monitor', HWCode: 'MN' },
        { HWName: 'Desktop-PC', HWCode: 'DT' },
      ],
    });
  }

  if ((await prisma.hS.count()) === 0) {
    await prisma.hS.createMany({
      data: [
        { HSName: 'Lenovo' },
        { HSName: 'Apple' },
        { HSName: 'Samsung' },
        { HSName: 'Dell' },
        { HSName: 'HP' },
        { HSName: 'Microsoft' },
      ],
    });
  }

  if ((await prisma.mOD.count()) === 0) {
    await prisma.mOD.createMany({
      data: [
        { ModName: 'ThinkPad T14', ModellNummer: 'T14 Gen 3' },
        { ModName: 'MacBook Pro 14"', ModellNummer: 'A2779' },
        { ModName: 'iPhone 15 Pro', ModellNummer: 'A3105' },
        { ModName: 'Galaxy Tab S9', ModellNummer: 'SM-X710' },
        { ModName: 'Galaxy S24 Ultra', ModellNummer: 'SM-S928B' },
        { ModName: 'Surface Pro 9', ModellNummer: 'QEZ-00004' },
        { ModName: 'XPS 15', ModellNummer: '9530' },
        { ModName: 'EliteBook 840', ModellNummer: 'G10' },
        { ModName: 'UltraSharp U2723QE', ModellNummer: '27" 4K' },
        { ModName: 'ThinkVision T27i', ModellNummer: '27" FHD' },
      ],
    });
  }

  if ((await prisma.zT.count()) === 0) {
    await prisma.zT.createMany({
      data: [
        { ZTName: 'Netzteil' },
        { ZTName: 'Dockingstation' },
        { ZTName: 'Hülle' },
        { ZTName: 'Ladekabel' },
        { ZTName: 'Tastatur' },
        { ZTName: 'Maus' },
        { ZTName: 'Kopfhörer' },
        { ZTName: 'Webcam' },
      ],
    });
  }
}

async function seedRelationsAndInventory() {
  const [hardware, manufacturers, models, accessoryTypes] = await Promise.all([
    prisma.hW.findMany(),
    prisma.hS.findMany(),
    prisma.mOD.findMany(),
    prisma.zT.findMany(),
  ]);

  const hwByName = Object.fromEntries(hardware.map((item) => [item.HWName ?? '', item.HWID]));
  const hsByName = Object.fromEntries(manufacturers.map((item) => [item.HSName ?? '', item.HSID]));
  const modByName = Object.fromEntries(models.map((item) => [item.ModName ?? '', item.ModID]));
  const ztByName = Object.fromEntries(accessoryTypes.map((item) => [item.ZTName, item.ID]));

  if ((await prisma.hW_HS.count()) === 0) {
    await prisma.hW_HS.createMany({
      data: [
        { HWID: hwByName['Laptop'], HSID: hsByName['Lenovo'] },
        { HWID: hwByName['Laptop'], HSID: hsByName['Apple'] },
        { HWID: hwByName['Laptop'], HSID: hsByName['Dell'] },
        { HWID: hwByName['Laptop'], HSID: hsByName['HP'] },
        { HWID: hwByName['Smartphone'], HSID: hsByName['Apple'] },
        { HWID: hwByName['Smartphone'], HSID: hsByName['Samsung'] },
        { HWID: hwByName['Tablet'], HSID: hsByName['Samsung'] },
        { HWID: hwByName['Tablet'], HSID: hsByName['Microsoft'] },
        { HWID: hwByName['Monitor'], HSID: hsByName['Dell'] },
        { HWID: hwByName['Monitor'], HSID: hsByName['Lenovo'] },
      ].filter((row) => row.HWID && row.HSID) as { HWID: number; HSID: number }[],
    });
  }

  if ((await prisma.hS_MOD.count()) === 0) {
    await prisma.hS_MOD.createMany({
      data: [
        { HSID: hsByName['Lenovo'], ModID: modByName['ThinkPad T14'], HWID: hwByName['Laptop'] ?? null },
        { HSID: hsByName['Apple'], ModID: modByName['MacBook Pro 14"'], HWID: hwByName['Laptop'] ?? null },
        { HSID: hsByName['Apple'], ModID: modByName['iPhone 15 Pro'], HWID: hwByName['Smartphone'] ?? null },
        { HSID: hsByName['Samsung'], ModID: modByName['Galaxy Tab S9'], HWID: hwByName['Tablet'] ?? null },
        { HSID: hsByName['Samsung'], ModID: modByName['Galaxy S24 Ultra'], HWID: hwByName['Smartphone'] ?? null },
        { HSID: hsByName['Microsoft'], ModID: modByName['Surface Pro 9'], HWID: hwByName['Tablet'] ?? null },
        { HSID: hsByName['Dell'], ModID: modByName['XPS 15'], HWID: hwByName['Laptop'] ?? null },
        { HSID: hsByName['HP'], ModID: modByName['EliteBook 840'], HWID: hwByName['Laptop'] ?? null },
        { HSID: hsByName['Dell'], ModID: modByName['UltraSharp U2723QE'], HWID: hwByName['Monitor'] ?? null },
        { HSID: hsByName['Lenovo'], ModID: modByName['ThinkVision T27i'], HWID: hwByName['Monitor'] ?? null },
      ].filter((row) => row.HSID && row.ModID) as { HSID: number; ModID: number; HWID: number | null }[],
    });
  }

  if ((await prisma.zubehoer.count()) === 0) {
    await prisma.zubehoer.createMany({
      data: [
        {
          ZTID: ztByName['Netzteil'],
          HWID: hwByName['Laptop'],
          ModID: modByName['ThinkPad T14'],
          HSID: hsByName['Lenovo'],
          Beschreibung: '65W USB-C Netzteil',
        },
        {
          ZTID: ztByName['Dockingstation'],
          HWID: hwByName['Laptop'],
          ModID: modByName['MacBook Pro 14"'],
          HSID: hsByName['Apple'],
          Beschreibung: 'Thunderbolt 4 Dock',
        },
        {
          ZTID: ztByName['Hülle'],
          HWID: hwByName['Tablet'],
          ModID: modByName['Galaxy Tab S9'],
          HSID: hsByName['Samsung'],
          Beschreibung: 'Book Cover Keyboard',
        },
        {
          ZTID: ztByName['Ladekabel'],
          HWID: hwByName['Smartphone'],
          ModID: modByName['iPhone 15 Pro'],
          HSID: hsByName['Apple'],
          Beschreibung: 'Lightning auf USB-C Kabel',
        },
        {
          ZTID: ztByName['Tastatur'],
          HWID: hwByName['Laptop'],
          ModID: null,
          HSID: null,
          Beschreibung: 'Externe Bluetooth Tastatur',
        },
        {
          ZTID: ztByName['Maus'],
          HWID: hwByName['Laptop'],
          ModID: null,
          HSID: null,
          Beschreibung: 'Wireless Maus',
        },
        {
          ZTID: ztByName['Kopfhörer'],
          HWID: hwByName['Smartphone'],
          ModID: null,
          HSID: hsByName['Apple'],
          Beschreibung: 'AirPods Pro 2',
        },
        {
          ZTID: ztByName['Webcam'],
          HWID: hwByName['Laptop'],
          ModID: null,
          HSID: null,
          Beschreibung: 'Logitech C920 HD Pro',
        },
      ].filter((row) => row.ZTID && row.HWID) as {
        ZTID: number;
        HWID: number;
        ModID: number | null;
        HSID: number | null;
        Beschreibung: string;
      }[],
    });
  }
}

async function seedUsersAndAssignments() {
  const [departments, statuses, offices, accessories] = await Promise.all([
    prisma.aBT.findMany(),
    prisma.sTAT.findMany(),
    prisma.gS.findMany(),
    prisma.zubehoer.findMany(),
  ]);

  const abtByName = Object.fromEntries(departments.map((item) => [item.ABTName ?? '', item.ABTID]));
  const statByName = Object.fromEntries(statuses.map((item) => [item.StatusName ?? '', item.StatusID]));
  const gsByName = Object.fromEntries(offices.map((item) => [item.GSName ?? '', item.GSID]));

  if ((await prisma.benutzer.count()) === 0) {
    await prisma.benutzer.createMany({
      data: [
        {
          BenutzerName: 'Max Mustermann',
          BenutzerRaum: '1.OG 101',
          ABTID: abtByName['IT-Abteilung'],
          StatusID: statByName['Aktiv'],
          GSID: gsByName['Zentrale Berlin'],
        },
        {
          BenutzerName: 'Svenja Sommer',
          BenutzerRaum: 'EG 12',
          ABTID: abtByName['Einkauf'],
          StatusID: statByName['Aktiv'],
          GSID: gsByName['Logistik Hamburg'],
        },
        {
          BenutzerName: 'Thomas Technik',
          BenutzerRaum: '2.OG 205',
          ABTID: abtByName['IT-Abteilung'],
          StatusID: statByName['Aktiv'],
          GSID: gsByName['Zentrale Berlin'],
        },
        {
          BenutzerName: 'Anna Vertrieb',
          BenutzerRaum: '3.OG 301',
          ABTID: abtByName['Vertrieb'],
          StatusID: statByName['Aktiv'],
          GSID: gsByName['Vertrieb München'],
        },
        {
          BenutzerName: 'Peter Personal',
          BenutzerRaum: '1.OG 110',
          ABTID: abtByName['Personal'],
          StatusID: statByName['Elternzeit'],
          GSID: gsByName['Zentrale Berlin'],
        },
      ].filter((row) => row.ABTID && row.StatusID && row.GSID) as {
        BenutzerName: string;
        BenutzerRaum?: string | null;
        ABTID: number;
        StatusID: number;
        GSID: number;
      }[],
    });
  }

  const users = await prisma.benutzer.findMany();
  const hw = await prisma.hW.findMany();
  const hs = await prisma.hS.findMany();
  const mod = await prisma.mOD.findMany();

  const hwByName = Object.fromEntries(hw.map((item) => [item.HWName ?? '', item.HWID]));
  const hsByName = Object.fromEntries(hs.map((item) => [item.HSName ?? '', item.HSID]));
  const modByName = Object.fromEntries(mod.map((item) => [item.ModName ?? '', item.ModID]));

  // Geräte erstellen
  if ((await prisma.gER.count()) === 0) {
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);
    const lastYear = new Date(today);
    lastYear.setFullYear(today.getFullYear() - 1);

    await prisma.gER.createMany({
      data: [
        {
          HWID: hwByName['Laptop'],
          HSID: hsByName['Lenovo'],
          MODID: modByName['ThinkPad T14'],
          SNO: 'LEN-T14-001',
          InventarCode: 'NB-0001',
          Preis: 1299.00,
          Zugang: lastYear,
        },
        {
          HWID: hwByName['Laptop'],
          HSID: hsByName['Apple'],
          MODID: modByName['MacBook Pro 14"'],
          SNO: 'APL-MBP-001',
          InventarCode: 'NB-0002',
          Preis: 2499.00,
          Zugang: lastMonth,
        },
        {
          HWID: hwByName['Smartphone'],
          HSID: hsByName['Apple'],
          MODID: modByName['iPhone 15 Pro'],
          SNO: 'APL-IP15-001',
          InventarCode: 'SP-0001',
          Preis: 1199.00,
          Zugang: lastMonth,
          IMEI1: '123456789012345',
        },
        {
          HWID: hwByName['Smartphone'],
          HSID: hsByName['Samsung'],
          MODID: modByName['Galaxy S24 Ultra'],
          SNO: 'SAM-S24U-001',
          InventarCode: 'SP-0002',
          Preis: 1449.00,
          Zugang: today,
          IMEI1: '987654321098765',
        },
        {
          HWID: hwByName['Tablet'],
          HSID: hsByName['Samsung'],
          MODID: modByName['Galaxy Tab S9'],
          SNO: 'SAM-TAB-001',
          InventarCode: 'TB-0001',
          Preis: 899.00,
          Zugang: lastYear,
        },
        {
          HWID: hwByName['Monitor'],
          HSID: hsByName['Dell'],
          MODID: modByName['UltraSharp U2723QE'],
          SNO: 'DEL-MON-001',
          InventarCode: 'MN-0001',
          Preis: 649.00,
          Zugang: lastYear,
        },
        {
          HWID: hwByName['Laptop'],
          HSID: hsByName['Dell'],
          MODID: modByName['XPS 15'],
          SNO: 'DEL-XPS-001',
          InventarCode: 'NB-0003',
          Preis: 1899.00,
          Zugang: lastMonth,
        },
      ].filter((row) => row.HWID && row.HSID && row.MODID) as any[],
    });
  }

  const devices = await prisma.gER.findMany();

  // Benutzer-Geräte Zuordnungen
  if ((await prisma.benutzerGER.count()) === 0 && users.length > 0 && devices.length > 0) {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);

    await prisma.benutzerGER.createMany({
      data: [
        { BenutzerID: users[0].BenutzerID, GERID: devices[0].GerID, Start: lastMonth },
        { BenutzerID: users[1].BenutzerID, GERID: devices[1].GerID, Start: lastWeek },
        { BenutzerID: users[2].BenutzerID, GERID: devices[2].GerID, Start: lastMonth },
        { BenutzerID: users[3].BenutzerID, GERID: devices[3].GerID, Start: today },
      ],
    });
  }

  // Zubehör-Benutzer Zuordnungen
  if ((await prisma.zubehoerBenutzer.count()) === 0 && users.length > 0 && accessories.length > 0) {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);

    await prisma.zubehoerBenutzer.createMany({
      data: [
        { BenutzerID: users[0].BenutzerID, ZubehoerID: accessories[0].ZubehoerID, Start: lastWeek },
        { BenutzerID: users[1].BenutzerID, ZubehoerID: accessories[1].ZubehoerID, Start: today },
        { BenutzerID: users[2].BenutzerID, ZubehoerID: accessories[3].ZubehoerID, Start: lastWeek },
      ],
    });
  }

  // Zubehör-Inventar
  if ((await prisma.zubehoerInventar.count()) === 0 && accessories.length > 0) {
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);

    await prisma.zubehoerInventar.createMany({
      data: accessories.map((acc, idx) => ({
        ZubehoerID: acc.ZubehoerID,
        Menge: 5 + idx * 2,
        Zugang: lastMonth,
      })),
    });
  }
}

async function seedWebAdmin() {
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';

  const existing = await prisma.webUser.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    await prisma.webUser.create({
      data: {
        email: adminEmail,
        name: 'Admin',
        role: 'ADMIN',
        passwordHash: hashPassword(adminPassword),
      },
    });
  }
}

async function main() {
  console.log('Seeding reference data …');
  await seedReferenceData();
  console.log('Seeding relations and inventory …');
  await seedRelationsAndInventory();
  console.log('Seeding users and assignments …');
  await seedUsersAndAssignments();
  console.log('Ensuring web admin user …');
  await seedWebAdmin();
  console.log('Seeding completed. Test admin login: admin@example.com / admin123');
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
