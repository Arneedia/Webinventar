import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

// Büroinventar abschreiben: Abgang setzen, Zuordnung beenden, Bewegung protokollieren
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(req, AvailablePermissions.OFFICE_INVENTORY_DELETE);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const inventarId = Number(id);
    if (!Number.isInteger(inventarId)) {
      return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const grund = typeof body.grund === 'string' ? body.grund.trim() : '';
    const datum = body.datum ? new Date(body.datum) : new Date();
    if (!grund) {
      return NextResponse.json({ error: 'Bitte einen Grund für die Abschreibung angeben' }, { status: 400 });
    }
    if (Number.isNaN(datum.getTime())) {
      return NextResponse.json({ error: 'Ungültiges Datum' }, { status: 400 });
    }

    const current = await prisma.bueroInventar.findUnique({ where: { ID: inventarId } });
    if (!current) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }
    if (current.Abgang) {
      return NextResponse.json({ error: 'Dieser Eintrag ist bereits abgeschrieben' }, { status: 409 });
    }

    await prisma.$transaction([
      prisma.bueroInventar.update({
        where: { ID: inventarId },
        data: { Abgang: datum, AbgangGrund: grund, RaumID: null, BenutzerID: null },
      }),
      prisma.bueroBewegung.create({
        data: {
          InventarID: inventarId,
          Typ: 'ABGANG',
          VonBenutzerID: current.BenutzerID,
          VonRaumID: current.RaumID,
          Bemerkung: grund,
          Zeitpunkt: datum,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database error (POST /api/office-inventory/[id]/retire):', error);
    return NextResponse.json({ error: 'Abschreibung fehlgeschlagen' }, { status: 500 });
  }
}
