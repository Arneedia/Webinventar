import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

// Einzelnes Büroinventar abrufen
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(req, AvailablePermissions.DEVICES_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const item = await prisma.bueroInventar.findUnique({
      where: { ID: parseInt(id) },
      include: {
        Kategorie: true,
        Raum: {
          include: {
            GS: true,
          },
        },
        Benutzer: true,
        Bewegungen: {
          orderBy: { Zeitpunkt: 'desc' },
          include: {
            VonBenutzer: true,
            NachBenutzer: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Database error (GET /api/office-inventory/[id]):', error);
    return NextResponse.json({ error: 'Datenbankfehler', details: String(error) }, { status: 500 });
  }
}

// Büroinventar aktualisieren
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(req, AvailablePermissions.DEVICES_EDIT);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const {
      kategorieId,
      bezeichnung,
      beschreibung,
      inventarNr,
      seriennummer,
      hersteller,
      modell,
      anschaffungsdatum,
      anschaffungspreis,
      zustand,
      raumId,
      benutzerId,
      notiz,
    } = body;

    const current = await prisma.bueroInventar.findUnique({
      where: { ID: parseInt(id) },
    });

    if (!current) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    const item = await prisma.bueroInventar.update({
      where: { ID: parseInt(id) },
      data: {
        KategorieID: kategorieId,
        Bezeichnung: bezeichnung,
        Beschreibung: beschreibung,
        InventarNr: inventarNr,
        Seriennummer: seriennummer,
        Hersteller: hersteller,
        Modell: modell,
        Anschaffungsdatum: anschaffungsdatum ? new Date(anschaffungsdatum) : null,
        Anschaffungspreis: anschaffungspreis,
        Zustand: zustand,
        RaumID: raumId,
        BenutzerID: benutzerId,
        Notiz: notiz,
      },
      include: {
        Kategorie: true,
        Raum: true,
        Benutzer: true,
      },
    });

    // Bewegung: Standortwechsel oder Zuweisung
    if (current.RaumID !== raumId || current.BenutzerID !== benutzerId) {
      await prisma.bueroBewegung.create({
        data: {
          InventarID: item.ID,
          Typ: current.BenutzerID !== benutzerId ? 'ZUWEISUNG' : 'STANDORTWECHSEL',
          VonBenutzerID: current.BenutzerID,
          NachBenutzerID: benutzerId,
          VonRaumID: current.RaumID,
          NachRaumID: raumId,
          Bemerkung: 'Aktualisierung',
        },
      });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Database error (PATCH /api/office-inventory/[id]):', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren', details: String(error) }, { status: 500 });
  }
}

// Büroinventar löschen
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(req, AvailablePermissions.DEVICES_DELETE);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await params;

    await prisma.bueroBewegung.deleteMany({
      where: { InventarID: parseInt(id) },
    });

    await prisma.bueroInventar.delete({
      where: { ID: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database error (DELETE /api/office-inventory/[id]):', error);
    return NextResponse.json({ error: 'Fehler beim Löschen', details: String(error) }, { status: 500 });
  }
}
