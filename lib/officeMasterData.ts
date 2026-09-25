import { prisma } from '@/lib/prismaClient';
import { widenBereich } from '@/lib/masterDataBereich';

export type MasterDataType = 'hersteller' | 'modell';

export const isMasterDataType = (value: string): value is MasterDataType =>
  value === 'hersteller' || value === 'modell';

export const masterDataLabel = (type: MasterDataType) => (type === 'hersteller' ? 'Hersteller' : 'Modell');

// Prüft case-insensitiv, ob der Name bereits (bei einem anderen Datensatz) existiert
export async function findDuplicate(type: MasterDataType, name: string, excludeId?: number) {
  if (type === 'hersteller') {
    return prisma.hS.findFirst({
      where: { HSName: { equals: name, mode: 'insensitive' }, ...(excludeId ? { NOT: { HSID: excludeId } } : {}) },
    });
  }
  return prisma.mOD.findFirst({
    where: { ModName: { equals: name, mode: 'insensitive' }, ...(excludeId ? { NOT: { ModID: excludeId } } : {}) },
  });
}

// Hersteller/Modell für das Büroinventar sicherstellen: fehlende Einträge anlegen (Bereich BUERO),
// bestehende reine Geräte-Einträge auf BEIDE erweitern und die HS_MOD-Verknüpfung anlegen
export async function ensureOfficeMasterData(hersteller?: string | null, modell?: string | null) {
  let herstellerCreated = false;
  let modellCreated = false;
  let relationCreated = false;

  const herstellerName = hersteller?.trim();
  let hs = herstellerName
    ? await prisma.hS.findFirst({ where: { HSName: { equals: herstellerName, mode: 'insensitive' } } })
    : null;
  if (herstellerName && !hs) {
    hs = await prisma.hS.create({ data: { HSName: herstellerName, Bereich: 'BUERO' } });
    herstellerCreated = true;
  } else if (hs && widenBereich(hs.Bereich, 'BUERO') !== hs.Bereich) {
    await prisma.hS.update({ where: { HSID: hs.HSID }, data: { Bereich: widenBereich(hs.Bereich, 'BUERO') } });
  }

  const modellName = modell?.trim();
  let mod = modellName
    ? await prisma.mOD.findFirst({ where: { ModName: { equals: modellName, mode: 'insensitive' } } })
    : null;
  if (modellName && !mod) {
    mod = await prisma.mOD.create({ data: { ModName: modellName, Bereich: 'BUERO' } });
    modellCreated = true;
  } else if (mod && widenBereich(mod.Bereich, 'BUERO') !== mod.Bereich) {
    await prisma.mOD.update({ where: { ModID: mod.ModID }, data: { Bereich: widenBereich(mod.Bereich, 'BUERO') } });
  }

  if (hs && mod) {
    const existingRelation = await prisma.hS_MOD.findUnique({
      where: { HSID_ModID: { HSID: hs.HSID, ModID: mod.ModID } },
    });
    if (!existingRelation) {
      // Für Büroinventar kein Hardware-Typ
      await prisma.hS_MOD.create({ data: { HSID: hs.HSID, ModID: mod.ModID, HWID: null } });
      relationCreated = true;
    }
  }

  return { herstellerCreated, modellCreated, relationCreated };
}
