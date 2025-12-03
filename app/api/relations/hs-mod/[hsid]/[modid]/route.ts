import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser, Roles } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ hsid: string; modid: string }>;
}

function parseIds(hsid: string, modid: string) {
  const HSID = Number(hsid);
  const ModID = Number(modid);

  if (!Number.isInteger(HSID) || !Number.isInteger(ModID)) {
    throw NextResponse.json({ error: 'Ungültige IDs' }, { status: 400 });
  }

  return { HSID, ModID };
}

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

export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, Roles.ADMIN);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { hsid, modid } = await context.params;
    const { HSID, ModID } = parseIds(hsid, modid);
    const { HWID } = await req.json();

    const hwIdNumber = HWID === undefined || HWID === null || HWID === '' ? null : Number(HWID);
    if (hwIdNumber !== null && !Number.isInteger(hwIdNumber)) {
      return NextResponse.json({ error: 'HWID muss eine gültige Zahl sein' }, { status: 400 });
    }

    const updated = await prisma.hS_MOD.update({
      where: { HSID_ModID: { HSID, ModID } },
      data: { HWID: hwIdNumber },
      include: { HS: true, MOD: true, HW: true },
    });

    return NextResponse.json({ relation: serializeRelation(updated) });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error('Error in PUT /api/relations/hs-mod/[hsid]/[modid]:', error);
    return NextResponse.json({ error: 'Zuordnung konnte nicht aktualisiert werden' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, Roles.ADMIN);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { hsid, modid } = await context.params;
    const { HSID, ModID } = parseIds(hsid, modid);

    await prisma.hS_MOD.delete({ where: { HSID_ModID: { HSID, ModID } } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error('Error in DELETE /api/relations/hs-mod/[hsid]/[modid]:', error);
    return NextResponse.json({ error: 'Zuordnung konnte nicht gelöscht werden' }, { status: 500 });
  }
}
