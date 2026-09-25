import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';
import { ensureOfficeMasterData } from '@/lib/officeMasterData';

/**
 * Erstellt ein Büro-Inventar-Item und legt automatisch Hersteller/Modell an,
 * wenn diese noch nicht existieren. Verknüpft sie in der HS_MOD-Tabelle.
 */
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

    // Validierung
    if (!kategorieId || !bezeichnung) {
      return NextResponse.json(
        { error: 'KategorieId und Bezeichnung sind erforderlich' },
        { status: 400 }
      );
    }

    const { herstellerCreated, modellCreated, relationCreated } = await ensureOfficeMasterData(hersteller, modell);

    // Büro-Inventar erstellen
    const bueroInventar = await prisma.bueroInventar.create({
      data: {
        KategorieID: parseInt(kategorieId),
        Bezeichnung: bezeichnung,
        Beschreibung: beschreibung || null,
        InventarNr: inventarNr || null,
        Seriennummer: seriennummer || null,
        Hersteller: hersteller || null,
        Modell: modell || null,
        Anschaffungsdatum: anschaffungsdatum ? new Date(anschaffungsdatum) : null,
        Anschaffungspreis: anschaffungspreis ? parseFloat(anschaffungspreis) : null,
        Zustand: zustand || 'GUT',
        RaumID: raumId ? parseInt(raumId) : null,
        BenutzerID: benutzerId ? parseInt(benutzerId) : null,
        Notiz: notiz || null,
      },
      include: {
        Kategorie: true,
        Raum: {
          include: {
            GS: true,
          },
        },
        Benutzer: true,
      },
    });

    // Bewegung: ZUGANG
    await prisma.bueroBewegung.create({
      data: {
        InventarID: bueroInventar.ID,
        Typ: 'ZUGANG',
        NachBenutzerID: bueroInventar.BenutzerID,
        NachRaumID: bueroInventar.RaumID,
        Bemerkung: 'Erstanlage',
      },
    });

    // Response formatieren
    const response = {
      id: bueroInventar.ID,
      kategorieId: bueroInventar.KategorieID,
      kategorieName: bueroInventar.Kategorie?.Name || null,
      bezeichnung: bueroInventar.Bezeichnung,
      beschreibung: bueroInventar.Beschreibung,
      inventarNr: bueroInventar.InventarNr,
      seriennummer: bueroInventar.Seriennummer,
      hersteller: bueroInventar.Hersteller,
      modell: bueroInventar.Modell,
      anschaffungsdatum: bueroInventar.Anschaffungsdatum?.toISOString() || null,
      anschaffungspreis: bueroInventar.Anschaffungspreis ? Number(bueroInventar.Anschaffungspreis) : null,
      zustand: bueroInventar.Zustand,
      raumId: bueroInventar.RaumID,
      raumName: bueroInventar.Raum?.RaumName || null,
      raumStandort: bueroInventar.Raum?.Standort || null,
      raumBranch: bueroInventar.Raum?.GS?.GSName || null,
      benutzerId: bueroInventar.BenutzerID,
      benutzerName: bueroInventar.Benutzer?.BenutzerName || null,
      notiz: bueroInventar.Notiz,
      createdAt: bueroInventar.createdAt.toISOString(),
      updatedAt: bueroInventar.updatedAt.toISOString(),
      // Zusätzliche Info über erstellte Relationen
      _meta: {
        herstellerCreated,
        modellCreated,
        relationCreated,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/office-inventory/create-with-relations:', error);
    
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Ein Eintrag mit dieser Inventarnummer existiert bereits' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Fehler beim Erstellen des Inventars',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
