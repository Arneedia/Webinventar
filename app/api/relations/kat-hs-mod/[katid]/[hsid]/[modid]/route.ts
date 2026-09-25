import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

type RouteContext = { params: Promise<{ katid: string; hsid: string; modid: string }> };

export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.MASTER_DATA_EDIT);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { katid, hsid, modid } = await context.params;
    const [KategorieID, HSID, ModID] = [katid, hsid, modid].map(Number);
    if (![KategorieID, HSID, ModID].every(Number.isInteger)) {
      return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
    }

    await prisma.kAT_HS_MOD.delete({ where: { KategorieID_HSID_ModID: { KategorieID, HSID, ModID } } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Zuordnung nicht gefunden' }, { status: 404 });
    }
    console.error('Error in DELETE /api/relations/kat-hs-mod/[katid]/[hsid]/[modid]:', error);
    return NextResponse.json({ error: 'Zuordnung konnte nicht gelöscht werden' }, { status: 500 });
  }
}
