import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/apiError';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';
import { ensureOfficeMasterData } from '@/lib/officeMasterData';

// Einzelnes Büroinventar abrufen
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(req, AvailablePermissions.OFFICE_INVENTORY_VIEW);
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
    return apiErrorResponse(error);
  }
}

// Büroinventar aktualisieren (mit automatischer Hersteller/Modell-Anlage)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(req, AvailablePermissions.OFFICE_INVENTORY_EDIT);
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
    if (current.Abgang) {
      return NextResponse.json({ error: 'Abgeschriebene Einträge können nicht bearbeitet werden' }, { status: 409 });
    }

    const { herstellerCreated, modellCreated, relationCreated } = await ensureOfficeMasterData(hersteller, modell);

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

    return NextResponse.json({
      ...item,
      _meta: {
        herstellerCreated,
        modellCreated,
        relationCreated,
      },
    });
  } catch (error) {
    console.error('Database error (PATCH /api/office-inventory/[id]):', error);
    return apiErrorResponse(error, 'Fehler beim Aktualisieren');
  }
}
