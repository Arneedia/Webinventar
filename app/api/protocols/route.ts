import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

// Hilfsfunktion für Protokoll-Nummer Generierung
async function generateProtokollNr(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `UP-${year}-`;
  
  // Höchste Nummer für dieses Jahr finden
  const lastProtocol = await prisma.uebergabeProtokoll.findFirst({
    where: { ProtokollNr: { startsWith: prefix } },
    orderBy: { ProtokollNr: 'desc' },
    select: { ProtokollNr: true },
  });
  
  let nextNum = 1;
  if (lastProtocol?.ProtokollNr) {
    const match = lastProtocol.ProtokollNr.match(/-(\d+)$/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }
  
  return `${prefix}${nextNum.toString().padStart(5, '0')}`;
}

// GET: Liste aller Protokolle
export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.PROTOCOLS_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const typ = searchParams.get('typ');
    const benutzerId = searchParams.get('benutzerId');
    
    const where: any = {};
    if (status) where.Status = status;
    if (typ) where.Typ = typ;
    if (benutzerId) where.BenutzerID = parseInt(benutzerId, 10);

    const protocols = await prisma.uebergabeProtokoll.findMany({
      where,
      include: {
        Benutzer: {
          include: {
            ABT: true,
            GS: true,
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
      orderBy: { ErstelltAm: 'desc' },
    }) as any[];

    const data = protocols.map((p: any) => ({
      id: p.ID,
      protokollNr: p.ProtokollNr,
      typ: p.Typ,
      status: p.Status,
      erstelltAm: p.ErstelltAm.toISOString(),
      unterschriftDatum: p.UnterschriftDatum?.toISOString() ?? null,
      bemerkung: p.Bemerkung,
      aufgaben: p.Aufgaben?.map((t: any) => ({
        id: t.ID,
        titel: t.Titel,
        beschreibung: t.Beschreibung,
        faelligAm: t.FaelligAm?.toISOString() ?? null,
        status: t.Status,
      })) ?? [],
      benutzer: {
        id: p.Benutzer.BenutzerID,
        name: p.Benutzer.BenutzerName,
        abteilung: p.Benutzer.ABT?.ABTName ?? null,
        geschaeftsstelle: p.Benutzer.GS?.GSName ?? null,
        raum: p.Benutzer.BenutzerRaum,
      },
      ersteller: {
        id: p.Ersteller.id,
        name: p.Ersteller.name,
        email: p.Ersteller.email,
      },
      positionen: p.Positionen.map((pos: any) => ({
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
      hatUnterschriftMitarbeiter: !!p.UnterschriftMitarbeiter,
      hatUnterschriftIT: !!p.UnterschriftIT,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching protocols:', error);
    return NextResponse.json({ error: 'Datenbankfehler' }, { status: 500 });
  }
}

// POST: Neues Protokoll erstellen
export async function POST(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.PROTOCOLS_CREATE);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { typ, benutzerId, bemerkung, positionen, aufgaben } = body;

    // Validierung
    if (!typ || !['AUSGABE', 'RUECKGABE', 'TAUSCH'].includes(typ)) {
      return NextResponse.json({ error: 'Ungültiger Protokoll-Typ' }, { status: 400 });
    }
    if (!benutzerId || typeof benutzerId !== 'number') {
      return NextResponse.json({ error: 'Benutzer-ID erforderlich' }, { status: 400 });
    }
    if (!positionen || !Array.isArray(positionen) || positionen.length === 0) {
      return NextResponse.json({ error: 'Mindestens eine Position erforderlich' }, { status: 400 });
    }

    // Benutzer prüfen
    const benutzer = await prisma.benutzer.findUnique({
      where: { BenutzerID: benutzerId },
    });
    if (!benutzer) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    // Protokoll-Nummer generieren
    const protokollNr = await generateProtokollNr();

    // Protokoll mit Positionen und Aufgaben erstellen
    const protocol = await prisma.uebergabeProtokoll.create({
      data: {
        ProtokollNr: protokollNr,
        Typ: typ,
        BenutzerID: benutzerId,
        ErstelltVon: auth.user!.id,
        Status: 'ENTWURF',
        Bemerkung: bemerkung || null,
        Positionen: {
          create: positionen.map((pos: any) => ({
            GerID: pos.gerID || null,
            ZubehoerID: pos.zubehoerID || null,
            Zustand: pos.zustand || 'GUT',
            ZustandNotiz: pos.zustandNotiz || null,
            Vollstaendig: pos.vollstaendig !== false,
            FehlendTeile: pos.fehlendTeile || null,
          })),
        },
        Aufgaben: aufgaben && Array.isArray(aufgaben) ? {
          create: aufgaben.map((t: any) => ({
            Titel: t.titel,
            Beschreibung: t.beschreibung || null,
            FaelligAm: t.faelligAm ? new Date(t.faelligAm) : null,
            Status: t.status || 'OFFEN',
          })),
        } : undefined,
      },
      include: {
        Benutzer: true,
        Ersteller: { select: { id: true, name: true, email: true } },
        Positionen: true,
        Aufgaben: true,
      },
    } as any);

    return NextResponse.json({
      id: protocol.ID,
      protokollNr: protocol.ProtokollNr,
      message: 'Protokoll erstellt',
    });
  } catch (error) {
    console.error('Error creating protocol:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen des Protokolls' }, { status: 500 });
  }
}
