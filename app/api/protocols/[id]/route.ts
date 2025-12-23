import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET: Einzelnes Protokoll laden
export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.PROTOCOLS_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const protocolId = parseInt(id, 10);

    if (isNaN(protocolId)) {
      return NextResponse.json({ error: 'Ungültige Protokoll-ID' }, { status: 400 });
    }

    const protocol = await prisma.uebergabeProtokoll.findUnique({
      where: { ID: protocolId },
      include: {
        Benutzer: {
          include: {
            ABT: true,
            GS: true,
            STAT: true,
          },
        },
        Ersteller: {
          select: { id: true, name: true, email: true },
        },
        Positionen: {
          include: {
            GER: {
              include: { HW: true, HS: true, MOD: true },
            },
            Zubehoer: {
              include: { ZT: true, HS: true, MOD: true },
            },
          },
        },
        Aufgaben: true,
      } as any,
    }) as any;

    if (!protocol) {
      return NextResponse.json({ error: 'Protokoll nicht gefunden' }, { status: 404 });
    }

    const data = {
      id: protocol.ID,
      protokollNr: protocol.ProtokollNr,
      typ: protocol.Typ,
      status: protocol.Status,
      erstelltAm: protocol.ErstelltAm.toISOString(),
      unterschriftMitarbeiter: protocol.UnterschriftMitarbeiter,
      unterschriftIT: protocol.UnterschriftIT,
      unterschriftDatum: protocol.UnterschriftDatum?.toISOString() ?? null,
      bemerkung: protocol.Bemerkung,
      aufgaben: (protocol.Aufgaben || []).map((t: any) => ({
        id: t.ID,
        titel: t.Titel,
        beschreibung: t.Beschreibung,
        faelligAm: t.FaelligAm?.toISOString() ?? null,
        status: t.Status,
        assignedBenutzerId: t.AssignedBenutzerID ?? null,
        assignedBenutzerName: t.AssignedBenutzer?.BenutzerName ?? null,
        assignedAbteilungId: t.AssignedAbteilungID ?? null,
        assignedAbteilungName: t.AssignedAbteilung?.ABTName ?? null,
      })),
      benutzer: {
        id: protocol.Benutzer.BenutzerID,
        name: protocol.Benutzer.BenutzerName,
        abteilung: protocol.Benutzer.ABT?.ABTName ?? null,
        geschaeftsstelle: protocol.Benutzer.GS?.GSName ?? null,
        status: protocol.Benutzer.STAT?.StatusName ?? null,
        raum: protocol.Benutzer.BenutzerRaum,
      },
      ersteller: {
        id: protocol.Ersteller.id,
        name: protocol.Ersteller.name,
        email: protocol.Ersteller.email,
      },
      positionen: protocol.Positionen.map((pos: any) => ({
        id: pos.ID,
        zustand: pos.Zustand,
        zustandNotiz: pos.ZustandNotiz,
        vollstaendig: pos.Vollstaendig,
        fehlendTeile: pos.FehlendTeile,
        geraet: pos.GER
          ? {
              id: pos.GER.GerID,
              inventarCode: pos.GER.InventarCode,
              sno: pos.GER.SNO,
              hwName: pos.GER.HW?.HWName ?? null,
              hsName: pos.GER.HS?.HSName ?? null,
              modName: pos.GER.MOD?.ModName ?? null,
              preis: pos.GER.Preis ? Number(pos.GER.Preis) : null,
            }
          : null,
        zubehoer: pos.Zubehoer
          ? {
              id: pos.Zubehoer.ZubehoerID,
              typ: pos.Zubehoer.ZT?.ZTName ?? null,
              hersteller: pos.Zubehoer.HS?.HSName ?? null,
              modell: pos.Zubehoer.MOD?.ModName ?? null,
              beschreibung: pos.Zubehoer.Beschreibung,
            }
          : null,
      })),
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching protocol:', error);
    return NextResponse.json({ error: 'Datenbankfehler' }, { status: 500 });
  }
}

// PUT: Protokoll aktualisieren
export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.PROTOCOLS_EDIT);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const protocolId = parseInt(id, 10);

    if (isNaN(protocolId)) {
      return NextResponse.json({ error: 'Ungültige Protokoll-ID' }, { status: 400 });
    }

    const existing = await prisma.uebergabeProtokoll.findUnique({
      where: { ID: protocolId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Protokoll nicht gefunden' }, { status: 404 });
    }

    // Nur Entwürfe können bearbeitet werden
    if (existing.Status !== 'ENTWURF') {
      return NextResponse.json(
        { error: 'Nur Entwürfe können bearbeitet werden' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { bemerkung, status, positionen, aufgaben } = body;

    // Protokoll aktualisieren
    const updateData: any = {};
    if (bemerkung !== undefined) updateData.Bemerkung = bemerkung;
    if (status && ['ENTWURF', 'OFFEN'].includes(status)) updateData.Status = status;

    await prisma.uebergabeProtokoll.update({
      where: { ID: protocolId },
      data: updateData,
    });

    // Positionen aktualisieren falls vorhanden
    if (positionen && Array.isArray(positionen)) {
      // Alte Positionen löschen und neue erstellen
      await prisma.uebergabePosition.deleteMany({
        where: { ProtokollID: protocolId },
      });

      await prisma.uebergabePosition.createMany({
        data: positionen.map((pos: any) => ({
          ProtokollID: protocolId,
          GerID: pos.gerID || null,
          ZubehoerID: pos.zubehoerID || null,
          Zustand: pos.zustand || 'GUT',
          ZustandNotiz: pos.zustandNotiz || null,
          Vollstaendig: pos.vollstaendig !== false,
          FehlendTeile: pos.fehlendTeile || null,
        })),
      });
    }

    // Aufgaben aktualisieren
    if (aufgaben && Array.isArray(aufgaben)) {
      await (prisma as any).uebergabeAufgabe.deleteMany({
        where: { ProtokollID: protocolId },
      });
      await (prisma as any).uebergabeAufgabe.createMany({
        data: aufgaben.map((t, i) => ({
          ProtokollID: protocolId,
          Titel: t.titel.trim() || `Aufgabe ${i + 1}`,
          Beschreibung: t.beschreibung?.trim() || null,
          FaelligAm: t.faelligAm || null,
          Status: t.status || 'OFFEN',
          AssignedBenutzerID: t.assignedBenutzerId || null,
          AssignedAbteilungID: t.assignedAbteilungId || null,
        })),
      });
    }

    return NextResponse.json({ success: true, message: 'Protokoll aktualisiert' });
  } catch (error) {
    console.error('Error updating protocol:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 });
  }
}

// DELETE: Protokoll löschen (nur Entwürfe)
export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.PROTOCOLS_EDIT);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const protocolId = parseInt(id, 10);

    if (isNaN(protocolId)) {
      return NextResponse.json({ error: 'Ungültige Protokoll-ID' }, { status: 400 });
    }

    const existing = await prisma.uebergabeProtokoll.findUnique({
      where: { ID: protocolId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Protokoll nicht gefunden' }, { status: 404 });
    }

    // Nur Entwürfe können gelöscht werden
    if (existing.Status !== 'ENTWURF') {
      return NextResponse.json(
        { error: 'Nur Entwürfe können gelöscht werden' },
        { status: 400 }
      );
    }

    // Protokoll löschen (Positionen werden durch onDelete: Cascade mitgelöscht)
    await prisma.uebergabeProtokoll.delete({
      where: { ID: protocolId },
    });

    return NextResponse.json({ success: true, message: 'Protokoll gelöscht' });
  } catch (error) {
    console.error('Error deleting protocol:', error);
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 });
  }
}
