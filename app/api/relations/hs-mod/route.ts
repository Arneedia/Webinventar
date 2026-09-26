import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser, userHasAnyPermission } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

function serializeRelation(rel: any) {
  if (!rel) return null;
  return {
    HSID: rel.HSID,
    ModID: rel.ModID,
    HWID: rel.HWID,
    hsName: rel.HS?.HSName ?? null,
    modName: rel.MOD?.ModName ?? null,
    modellNummer: rel.MOD?.ModellNummer ?? null,
    hwName: rel.HW?.HWName ?? null,
    kategorien: (rel.Kategorien ?? []).map((k: any) => ({ ID: k.KategorieID, name: k.Kategorie?.Name ?? '' })),
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  if (!userHasAnyPermission(auth.user, [AvailablePermissions.MASTER_DATA_VIEW, AvailablePermissions.OFFICE_INVENTORY_VIEW, AvailablePermissions.RELATIONS_VIEW, AvailablePermissions.RELATIONS_DEVICES_VIEW, AvailablePermissions.RELATIONS_OFFICE_VIEW])) {
    return NextResponse.json({ error: 'Keine Berechtigung für diese Aktion' }, { status: 403 });
  }

  try {
    const relations = await prisma.hS_MOD.findMany({
      include: { HS: true, MOD: true, HW: true, Kategorien: { include: { Kategorie: true } } },
      orderBy: [{ HSID: 'asc' }, { ModID: 'asc' }],
    });
    return NextResponse.json({ relations: relations.map((rel) => serializeRelation(rel)) });
  } catch (error) {
    console.error('Error in GET /api/relations/hs-mod:', error);
    return NextResponse.json({ error: 'Zuordnungen konnten nicht geladen werden' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiUser(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  if (!userHasAnyPermission(auth.user, [AvailablePermissions.MASTER_DATA_EDIT, AvailablePermissions.RELATIONS_EDIT, AvailablePermissions.RELATIONS_DEVICES_EDIT, AvailablePermissions.RELATIONS_OFFICE_EDIT])) {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { HSID, ModID, HWID } = body;
    const kategorieIds: number[] = (Array.isArray(body.kategorieIds) ? body.kategorieIds : [])
      .map(Number)
      .filter((id: number) => Number.isInteger(id));

    const hsIdNumber = Number(HSID);
    const modIdNumber = Number(ModID);
    const hwIdNumber = HWID === undefined || HWID === null || HWID === '' ? null : Number(HWID);

    if (!Number.isInteger(hsIdNumber) || !Number.isInteger(modIdNumber)) {
      return NextResponse.json({ error: 'HSID und ModID müssen gültige Zahlen sein' }, { status: 400 });
    }

    if (hwIdNumber !== null && !Number.isInteger(hwIdNumber)) {
      return NextResponse.json({ error: 'HWID muss eine gültige Zahl sein' }, { status: 400 });
    }

    // Bereichsbezogene Prüfung: Hardware-Typ = Geräte, Büro-Kategorien = Büroinventar
    if (hwIdNumber !== null && !userHasAnyPermission(auth.user, [AvailablePermissions.MASTER_DATA_EDIT, AvailablePermissions.RELATIONS_EDIT, AvailablePermissions.RELATIONS_DEVICES_EDIT])) {
      return NextResponse.json({ error: 'Keine Berechtigung für Geräte-Zuordnungen' }, { status: 403 });
    }
    if (kategorieIds.length > 0 && !userHasAnyPermission(auth.user, [AvailablePermissions.MASTER_DATA_EDIT, AvailablePermissions.RELATIONS_EDIT, AvailablePermissions.RELATIONS_OFFICE_EDIT])) {
      return NextResponse.json({ error: 'Keine Berechtigung für Büro-Zuordnungen' }, { status: 403 });
    }

    const existing = await prisma.hS_MOD.findUnique({
      where: { HSID_ModID: { HSID: hsIdNumber, ModID: modIdNumber } },
    });

    if (existing) {
      return NextResponse.json({ error: 'Diese Zuordnung existiert bereits' }, { status: 409 });
    }

    const created = await prisma.$transaction(async (tx) => {
      await tx.hS_MOD.create({
        data: {
          HSID: hsIdNumber,
          ModID: modIdNumber,
          HWID: hwIdNumber,
        },
      });
      if (kategorieIds.length) {
        await tx.kAT_HS_MOD.createMany({
          data: kategorieIds.map((KategorieID) => ({ KategorieID, HSID: hsIdNumber, ModID: modIdNumber })),
          skipDuplicates: true,
        });
      }
      return tx.hS_MOD.findUniqueOrThrow({
        where: { HSID_ModID: { HSID: hsIdNumber, ModID: modIdNumber } },
        include: { HS: true, MOD: true, HW: true, Kategorien: { include: { Kategorie: true } } },
      });
    });

    return NextResponse.json({ relation: serializeRelation(created) }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/relations/hs-mod:', error);
    
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Diese Zuordnung existiert bereits (Datenbank-Constraint)' }, { status: 409 });
    }
    
    return NextResponse.json({ error: 'Zuordnung konnte nicht erstellt werden' }, { status: 500 });
  }
}
