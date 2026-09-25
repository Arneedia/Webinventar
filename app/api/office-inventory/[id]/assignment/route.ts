import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

const toId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : NaN;
};

// Raum- und Benutzerzuordnung eines Büroinventars ändern (mit Bewegungshistorie)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(req, AvailablePermissions.DEVICES_EDIT);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const inventarId = Number(id);
    const body = await req.json();
    const raumId = toId(body.raumId);
    const benutzerId = toId(body.benutzerId);

    if (!Number.isInteger(inventarId) || Number.isNaN(raumId) || Number.isNaN(benutzerId)) {
      return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 });
    }

    const current = await prisma.bueroInventar.findUnique({ where: { ID: inventarId } });
    if (!current) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }
    if (current.Abgang) {
      return NextResponse.json({ error: 'Abgeschriebene Einträge können nicht zugeordnet werden' }, { status: 409 });
    }

    if (benutzerId !== null) {
      const benutzer = await prisma.benutzer.findUnique({ where: { BenutzerID: benutzerId } });
      if (!benutzer) {
        return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
      }
      if (benutzer.RaumID && raumId !== null && benutzer.RaumID !== raumId) {
        return NextResponse.json(
          { error: 'Der Benutzer ist diesem Raum nicht zugeordnet' },
          { status: 400 }
        );
      }
    }

    const userChanged = current.BenutzerID !== benutzerId;
    const roomChanged = current.RaumID !== raumId;
    if (!userChanged && !roomChanged) {
      return NextResponse.json({ success: true, changed: false });
    }

    await prisma.$transaction([
      prisma.bueroInventar.update({
        where: { ID: inventarId },
        data: { RaumID: raumId, BenutzerID: benutzerId },
      }),
      prisma.bueroBewegung.create({
        data: {
          InventarID: inventarId,
          Typ: userChanged ? (benutzerId ? 'ZUWEISUNG' : 'RUECKGABE') : 'STANDORTWECHSEL',
          VonBenutzerID: current.BenutzerID,
          NachBenutzerID: benutzerId,
          VonRaumID: current.RaumID,
          NachRaumID: raumId,
          Bemerkung: 'Zuordnung geändert',
        },
      }),
    ]);

    return NextResponse.json({ success: true, changed: true });
  } catch (error) {
    console.error('Database error (PATCH /api/office-inventory/[id]/assignment):', error);
    return NextResponse.json({ error: 'Zuordnung konnte nicht gespeichert werden' }, { status: 500 });
  }
}
