import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';
import { findDuplicate, isMasterDataType, masterDataLabel } from '@/lib/officeMasterData';
import { isBereich } from '@/lib/masterDataBereich';

// Hersteller bzw. Modell anlegen (ohne Duplikate), inkl. Bereich (Geräte/Büro/beide)
export async function POST(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const auth = await requireApiUser(req, AvailablePermissions.MASTER_DATA_EDIT);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { type } = await params;
    if (!isMasterDataType(type)) {
      return NextResponse.json({ error: 'Unbekannter Typ' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const nummer = typeof body.nummer === 'string' ? body.nummer.trim() : '';
    const bereich = body.bereich ?? 'BEIDE';
    if (!isBereich(bereich)) {
      return NextResponse.json({ error: 'Ungültiger Bereich' }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: 'Bitte einen Namen angeben' }, { status: 400 });
    }
    if (await findDuplicate(type, name)) {
      return NextResponse.json({ error: `${masterDataLabel(type)} „${name}“ existiert bereits` }, { status: 409 });
    }

    const created =
      type === 'hersteller'
        ? await prisma.hS.create({ data: { HSName: name, Bereich: bereich } })
        : await prisma.mOD.create({ data: { ModName: name, ModellNummer: nummer || null, Bereich: bereich } });

    return NextResponse.json({ success: true, item: created }, { status: 201 });
  } catch (error) {
    console.error('Database error (POST /api/office-master-data/[type]):', error);
    return NextResponse.json({ error: 'Eintrag konnte nicht angelegt werden' }, { status: 500 });
  }
}
