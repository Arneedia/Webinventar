import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
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
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.MASTER_DATA_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const relations = await prisma.hS_MOD.findMany({
      include: { HS: true, MOD: true, HW: true },
      orderBy: [{ HSID: 'asc' }, { ModID: 'asc' }],
    });
    return NextResponse.json({ relations: relations.map((rel) => serializeRelation(rel)) });
  } catch (error) {
    console.error('Error in GET /api/relations/hs-mod:', error);
    return NextResponse.json({ error: 'Zuordnungen konnten nicht geladen werden' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.MASTER_DATA_EDIT);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { HSID, ModID, HWID } = await req.json();

    const hsIdNumber = Number(HSID);
    const modIdNumber = Number(ModID);
    const hwIdNumber = HWID === undefined || HWID === null || HWID === '' ? null : Number(HWID);

    if (!Number.isInteger(hsIdNumber) || !Number.isInteger(modIdNumber)) {
      return NextResponse.json({ error: 'HSID und ModID müssen gültige Zahlen sein' }, { status: 400 });
    }

    if (hwIdNumber !== null && !Number.isInteger(hwIdNumber)) {
      return NextResponse.json({ error: 'HWID muss eine gültige Zahl sein' }, { status: 400 });
    }

    const existing = await prisma.hS_MOD.findUnique({
      where: { HSID_ModID: { HSID: hsIdNumber, ModID: modIdNumber } },
    });

    if (existing) {
      return NextResponse.json({ error: 'Diese Zuordnung existiert bereits' }, { status: 409 });
    }

    const created = await prisma.hS_MOD.create({
      data: {
        HSID: hsIdNumber,
        ModID: modIdNumber,
        HWID: hwIdNumber,
      },
      include: { HS: true, MOD: true, HW: true },
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
