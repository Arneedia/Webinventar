import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

function serializeRelation(rel: any) {
  if (!rel) return null;
  return {
    HWID: rel.HWID,
    HSID: rel.HSID,
    hwName: rel.HW?.HWName ?? null,
    hsName: rel.HS?.HSName ?? null,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.MASTER_DATA_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const relations = await prisma.hW_HS.findMany({
      include: { HW: true, HS: true },
      orderBy: [{ HWID: 'asc' }, { HSID: 'asc' }],
    });
    return NextResponse.json({ relations: relations.map(serializeRelation) });
  } catch (error) {
    console.error('Error in GET /api/relations/hw-hs:', error);
    return NextResponse.json({ error: 'Zuordnungen konnten nicht geladen werden' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.MASTER_DATA_EDIT);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { HWID, HSID } = await req.json();
    const hwIdNumber = Number(HWID);
    const hsIdNumber = Number(HSID);

    if (!Number.isInteger(hwIdNumber) || !Number.isInteger(hsIdNumber)) {
      return NextResponse.json({ error: 'HWID und HSID müssen gültige Zahlen sein' }, { status: 400 });
    }

    const existing = await prisma.hW_HS.findUnique({
      where: { HWID_HSID: { HWID: hwIdNumber, HSID: hsIdNumber } },
    });

    if (existing) {
      return NextResponse.json({ error: 'Diese Zuordnung existiert bereits' }, { status: 409 });
    }

    const created = await prisma.hW_HS.create({
      data: { HWID: hwIdNumber, HSID: hsIdNumber },
      include: { HW: true, HS: true },
    });

    return NextResponse.json({ relation: serializeRelation(created) }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/relations/hw-hs:', error);
    return NextResponse.json({ error: 'Zuordnung konnte nicht erstellt werden' }, { status: 500 });
  }
}
