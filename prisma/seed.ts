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
      ],
    });
  }

  if ((await prisma.sTAT.count()) === 0) {
    await prisma.sTAT.createMany({
      data: [
        { StatusName: 'Aktiv' },
        { StatusName: 'Inaktiv' },
        { StatusName: 'Extern' },
      ],
    });
  }

  if ((await prisma.gS.count()) === 0) {
    await prisma.gS.createMany({
      data: [
        { GSName: 'Zentrale Berlin', GSOrt: 'Berlin', GSPLZ: '10115', GSStrasse: 'Invalidenstraße', GSHausNr: '117' },
        { GSName: 'Logistik Hamburg', GSOrt: 'Hamburg', GSPLZ: '20095', GSStrasse: 'Speicherstadt', GSHausNr: '5' },
      ],
    });
  }

  if ((await prisma.hW.count()) === 0) {
    await prisma.hW.createMany({
      data: [
        { HWName: 'Laptop' },
        { HWName: 'Smartphone' },
        { HWName: 'Tablet' },
      ],
    });
  }

  if ((await prisma.hS.count()) === 0) {
    await prisma.hS.createMany({
      data: [
        { HSName: 'Lenovo' },
        { HSName: 'Apple' },
        { HSName: 'Samsung' },
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
      ],
    });
  }

  if ((await prisma.zT.count()) === 0) {
    await prisma.zT.createMany({
      data: [
        { ZTName: 'Netzteil' },
        { ZTName: 'Dockingstation' },
        { ZTName: 'Hülle' },
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
        { HWID: hwByName['Smartphone'], HSID: hsByName['Apple'] },
        { HWID: hwByName['Tablet'], HSID: hsByName['Samsung'] },
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
      ].filter((row) => row.ZTID && row.HWID && row.ModID && row.HSID) as {
        ZTID: number;
        HWID: number;
        ModID: number;
        HSID: number;
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

  if ((await prisma.zubehoerBenutzer.count()) === 0 && users.length > 0 && accessories.length > 0) {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);

    await prisma.zubehoerBenutzer.createMany({
      data: [
        {
          BenutzerID: users[0].BenutzerID,
          ZubehoerID: accessories[0].ZubehoerID,
          Start: lastWeek,
        },
      ],
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
