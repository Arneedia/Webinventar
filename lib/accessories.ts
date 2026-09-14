import { prisma } from './prismaClient';

export interface AccessoryTypeSummary {
  id: number;
  name: string;
  accessoryCount: number;
}

export interface AccessoryItemSummary {
  id: number;
  description: string | null;
  type: { id: number; name: string | null };
  hardware: { id: number | null; name: string | null };
  manufacturer: { id: number | null; name: string | null };
  model: { id: number | null; name: string | null; modellNummer: string | null };
  stock: number;
  assignments: { active: number; total: number };
}

export interface InventoryMovementSummary {
  id: number;
  typeId: number;
  typeName: string;
  quantity: number;
  direction: 'IN' | 'OUT';
  date: string;
  note: string | null;
}

export interface AccessoryAssignmentSummary {
  id: number;
  accessoryId: number;
  accessoryLabel: string;
  userId: number | null;
  userName: string;
  deviceId: number | null;
  deviceLabel: string | null;
  start: string;
  end: string | null;
  status: 'ACTIVE' | 'RETURNED';
}

export interface AccessoryOverviewPayload {
  types: AccessoryTypeSummary[];
  accessories: AccessoryItemSummary[];
  inventoryMovements: InventoryMovementSummary[];
  assignments: AccessoryAssignmentSummary[];
}

function formatDate(value: Date | null): string | null {
  if (!value) return null;
  return value.toISOString();
}

function buildAccessoryLabel(desc: string | null, fallbackId: number) {
  return desc?.trim() ? desc.trim() : `Zubehör #${fallbackId}`;
}

function buildDeviceLabel(device: { GerID: number; SNO: string | null } | null): string | null {
  if (!device) return null;
  if (device.SNO && device.SNO.trim().length > 0) {
    return `${device.SNO.trim()} (#${device.GerID})`;
  }
  return `Gerät #${device.GerID}`;
}

export async function getAccessoryOverview(): Promise<AccessoryOverviewPayload> {
  const [types, accessories, inventoryEntries, assignments] = await Promise.all([
    prisma.zT.findMany({
      include: { _count: { select: { Zubehoer: true } } },
      orderBy: { ZTName: 'asc' },
    }),
    prisma.zubehoer.findMany({
      include: {
        ZT: true,
        HW: true,
        HS: true,
        MOD: true,
      },
      orderBy: { ZubehoerID: 'asc' },
    }),
    prisma.zubehoerInventar.findMany({
      include: {
        ZT: {
          select: {
            ID: true,
            ZTName: true,
          },
        },
      },
      orderBy: { Zugang: 'desc' },
    }),
    prisma.zubehoerBenutzer.findMany({
      include: {
        Benutzer: true,
        Zubehoer: {
          select: {
            ZubehoerID: true,
            Beschreibung: true,
            ZT: { select: { ZTName: true } },
          },
        },
        GER: {
          select: {
            GerID: true,
            SNO: true,
          },
        },
      },
      orderBy: { Start: 'desc' },
    }),
  ]);

  const stockByType = new Map<number, number>();
  for (const entry of inventoryEntries) {
    const delta = entry.Abgang ? -entry.Menge : entry.Menge;
    stockByType.set(entry.ZTID, (stockByType.get(entry.ZTID) ?? 0) + delta);
  }

  const assignmentStats = new Map<number, { total: number; active: number }>();
  for (const record of assignments) {
    const stats = assignmentStats.get(record.ZubehoerID) ?? { total: 0, active: 0 };
    stats.total += 1;
    if (!record.Ende) {
      stats.active += 1;
    }
    assignmentStats.set(record.ZubehoerID, stats);
  }

  const typeSummaries: AccessoryTypeSummary[] = types.map((type) => ({
    id: type.ID,
    name: type.ZTName,
    accessoryCount: type._count.Zubehoer,
  }));

  const accessorySummaries: AccessoryItemSummary[] = accessories.map((item) => ({
    id: item.ZubehoerID,
    description: item.Beschreibung ?? null,
    type: { id: item.ZTID, name: item.ZT?.ZTName ?? null },
    hardware: { id: item.HWID, name: item.HW?.HWName ?? null },
    manufacturer: { id: item.HSID, name: item.HS?.HSName ?? null },
    model: {
      id: item.ModID,
      name: item.MOD?.ModName ?? null,
      modellNummer: item.MOD?.ModellNummer ?? null,
    },
    stock: stockByType.get(item.ZTID) ?? 0,
    assignments: assignmentStats.get(item.ZubehoerID) ?? { total: 0, active: 0 },
  }));

  const inventorySummaries: InventoryMovementSummary[] = inventoryEntries.map((entry) => ({
    id: entry.InventarID,
    typeId: entry.ZTID,
    typeName: entry.ZT?.ZTName ?? `Typ #${entry.ZTID}`,
    quantity: entry.Menge,
    direction: entry.Abgang ? 'OUT' : 'IN',
    date: formatDate(entry.Abgang ?? entry.Zugang) ?? new Date().toISOString(),
    note: entry.ZT?.ZTName ?? null,
  }));

  const assignmentSummaries: AccessoryAssignmentSummary[] = assignments.map((assignment) => ({
    id: assignment.ID,
    accessoryId: assignment.ZubehoerID,
    accessoryLabel: buildAccessoryLabel(
      assignment.Zubehoer?.Beschreibung ?? null,
      assignment.Zubehoer?.ZubehoerID ?? assignment.ZubehoerID,
    ),
    userId: assignment.BenutzerID,
    userName: assignment.Benutzer?.BenutzerName ?? `Benutzer #${assignment.BenutzerID}`,
    deviceId: assignment.GerID ?? null,
    deviceLabel: buildDeviceLabel(assignment.GER ?? null),
    start: formatDate(assignment.Start) ?? '',
    end: formatDate(assignment.Ende),
    status: assignment.Ende ? 'RETURNED' : 'ACTIVE',
  }));

  return {
    types: typeSummaries,
    accessories: accessorySummaries,
    inventoryMovements: inventorySummaries,
    assignments: assignmentSummaries,
  };
}
