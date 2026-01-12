import { prisma } from './prismaClient';
import type { Prisma } from '@prisma/client';

export type LookupOption = { id: number; name: string | null };

export type SerializableInventoryUser = {
  id: number;
  name: string | null;
  room: string | null;
  department: LookupOption | null;
  status: LookupOption | null;
  branch: LookupOption | null;
};

export type InventoryLookups = {
  departments: LookupOption[];
  statuses: LookupOption[];
  branches: LookupOption[];
};

type BenutzerWithRelations = Prisma.BenutzerGetPayload<{
  include: { ABT: true; GS: true; STAT: true };
}>;

export function serializeInventoryUser(user: BenutzerWithRelations): SerializableInventoryUser {
  return {
    id: user.BenutzerID,
    name: user.BenutzerName,
    room: user.BenutzerRaum,
    department: user.ABT
      ? { id: user.ABT.ABTID, name: user.ABT.ABTName }
      : user.ABTID
        ? { id: user.ABTID, name: null }
        : null,
    status: user.STAT
      ? { id: user.STAT.StatusID, name: user.STAT.StatusName }
      : user.StatusID
        ? { id: user.StatusID, name: null }
        : null,
    branch: user.GS
      ? { id: user.GS.GSID, name: user.GS.GSName }
      : user.GSID
        ? { id: user.GSID, name: null }
        : null,
  };
}

export async function fetchInventoryUsers(): Promise<SerializableInventoryUser[]> {
  const users = await prisma.benutzer.findMany({
    include: {
      ABT: true,
      GS: true,
      STAT: true,
    },
    orderBy: [{ BenutzerName: 'asc' }, { BenutzerID: 'asc' }],
  });

  return users.map(serializeInventoryUser);
}

export async function fetchInventoryLookups(): Promise<InventoryLookups> {
  const [departments, statuses, branches] = await Promise.all([
    prisma.aBT.findMany({
      orderBy: { ABTName: 'asc' },
    }),
    prisma.sTAT.findMany({
      orderBy: { StatusName: 'asc' },
    }),
    prisma.gS.findMany({
      orderBy: { GSName: 'asc' },
    }),
  ]);

  return {
    departments: departments.map((item) => ({ id: item.ABTID, name: item.ABTName })),
    statuses: statuses.map((item) => ({ id: item.StatusID, name: item.StatusName })),
    branches: branches.map((item) => ({ id: item.GSID, name: item.GSName })),
  };
}
