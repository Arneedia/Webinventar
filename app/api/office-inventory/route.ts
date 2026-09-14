import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

// Liste aller Büroinventar-Einträge
export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.DEVICES_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const items = await prisma.bueroInventar.findMany({
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
          take: 5,
          include: {
            VonBenutzer: true,
            NachBenutzer: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = items.map((item) => ({
      id: item.ID,
      kategorieId: item.KategorieID,
      kategorieName: item.Kategorie.Name,
      bezeichnung: item.Bezeichnung,
      beschreibung: item.Beschreibung,
      inventarNr: item.InventarNr,
      seriennummer: item.Seriennummer,
      hersteller: item.Hersteller,
      modell: item.Modell,
      anschaffungsdatum: item.Anschaffungsdatum,
      anschaffungspreis: item.Anschaffungspreis ? Number(item.Anschaffungspreis) : null,
      zustand: item.Zustand,
      raumId: item.RaumID,
      raumName: item.Raum?.RaumName ?? null,
      raumStandort: item.Raum?.Standort ?? null,
      raumBranch: item.Raum?.GS?.GSName ?? null,
      benutzerId: item.BenutzerID,
      benutzerName: item.Benutzer?.BenutzerName ?? null,
      notiz: item.Notiz,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      letzteBewegungenCount: item.Bewegungen.length,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error('Database error (GET /api/office-inventory):', error);
    return NextResponse.json({ error: 'Datenbankfehler', details: String(error) }, { status: 500 });
  }
}

// Neues Büroinventar erstellen
export async function POST(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.DEVICES_EDIT);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
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

    if (!kategorieId || !bezeichnung) {
      return NextResponse.json({ error: 'Kategorie und Bezeichnung sind erforderlich' }, { status: 400 });
    }

    const item = await prisma.bueroInventar.create({
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
        Zustand: zustand || 'GUT',
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

    // Bewegung: ZUGANG
    await prisma.bueroBewegung.create({
      data: {
        InventarID: item.ID,
        Typ: 'ZUGANG',
        NachBenutzerID: benutzerId,
        NachRaumID: raumId,
        Bemerkung: 'Erstanlage',
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Database error (POST /api/office-inventory):', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen', details: String(error) }, { status: 500 });
  }
}
