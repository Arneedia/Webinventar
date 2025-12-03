import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser, Roles } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ hwid: string; hsid: string }>;
}

function parseIds(hwid: string, hsid: string) {
  const HWID = Number(hwid);
  const HSID = Number(hsid);

  if (!Number.isInteger(HWID) || !Number.isInteger(HSID)) {
    throw NextResponse.json({ error: 'Ungültige IDs' }, { status: 400 });
  }

  return { HWID, HSID };
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, Roles.ADMIN);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { hwid, hsid } = await context.params;
    const { HWID, HSID } = parseIds(hwid, hsid);

    await prisma.hW_HS.delete({ where: { HWID_HSID: { HWID, HSID } } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error('Error in DELETE /api/relations/hw-hs/[hwid]/[hsid]:', error);
    return NextResponse.json({ error: 'Zuordnung konnte nicht gelöscht werden' }, { status: 500 });
  }
}
