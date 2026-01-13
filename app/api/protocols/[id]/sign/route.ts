import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST: Unterschrift hinzufügen
async function applyProtocolEffects(protocolId: number) {
  const protocol = await prisma.uebergabeProtokoll.findUnique({
    where: { ID: protocolId },
    include: {
      Positionen: true,
    },
  });

  if (!protocol) return;

  const now = new Date();

  // Geräte-Handling
  const deviceIds = protocol.Positionen.filter((p) => p.GerID !== null).map((p) => p.GerID!) ;
  // Zubehör-Handling
  const accessoryIds = protocol.Positionen.filter((p) => p.ZubehoerID !== null).map((p) => p.ZubehoerID!);

  await prisma.$transaction(async (tx) => {
    if (protocol.Typ === 'AUSGABE' || protocol.Typ === 'TAUSCH') {
      // Geräte neuen Benutzer zuordnen
      for (const gerId of deviceIds) {
        // offene Zuordnungen beenden
        await tx.benutzerGER.updateMany({
          where: { GERID: gerId, Ende: null },
          data: { Ende: now },
        });
        // Raum leeren, wenn Benutzerzuweisung erfolgt
        await tx.gER.update({
          where: { GerID: gerId },
          data: { StandardRaumID: null },
        });
        // neue Zuordnung erstellen
        await tx.benutzerGER.create({
          data: {
            BenutzerID: protocol.BenutzerID,
            GERID: gerId,
            Start: now,
          },
        });
      }

      // Zubehör dem Benutzer (und ggf. Gerät) zuordnen
      for (const zId of accessoryIds) {
        // offene Zuordnungen beenden
        await tx.zubehoerBenutzer.updateMany({
          where: { ZubehoerID: zId, Ende: null },
          data: { Ende: now },
        });
        await tx.zubehoerBenutzer.create({
          data: {
            BenutzerID: protocol.BenutzerID,
            ZubehoerID: zId,
            GerID: deviceIds[0] ?? null, // falls Gerät vorhanden, verknüpfen
            Start: now,
            Ende: null,
          },
        });
      }
    } else if (protocol.Typ === 'RUECKGABE') {
      // Geräte-Zuordnung beenden
      for (const gerId of deviceIds) {
        await tx.benutzerGER.updateMany({
          where: { GERID: gerId, Ende: null },
          data: { Ende: now },
        });
      }
      // Zubehör-Zuordnung beenden
      for (const zId of accessoryIds) {
        await tx.zubehoerBenutzer.updateMany({
          where: { ZubehoerID: zId, Ende: null },
          data: { Ende: now },
        });
      }
    }
  });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.PROTOCOLS_SIGN);
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

    // Nur offene Protokolle können unterschrieben werden
    if (existing.Status !== 'OFFEN' && existing.Status !== 'ENTWURF') {
      return NextResponse.json(
        { error: 'Dieses Protokoll kann nicht mehr unterschrieben werden' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { typ, signatur } = body;

    if (!typ || !['mitarbeiter', 'it'].includes(typ)) {
      return NextResponse.json(
        { error: 'Ungültiger Unterschrift-Typ (mitarbeiter oder it)' },
        { status: 400 }
      );
    }

    if (!signatur || typeof signatur !== 'string') {
      return NextResponse.json({ error: 'Signatur erforderlich (Base64)' }, { status: 400 });
    }

    // Unterschrift speichern
    const updateData: any = {};
    if (typ === 'mitarbeiter') {
      updateData.UnterschriftMitarbeiter = signatur;
    } else {
      updateData.UnterschriftIT = signatur;
    }

    // Prüfen ob nach dieser Unterschrift beide vorhanden sind
    const afterUpdate = {
      mitarbeiter: typ === 'mitarbeiter' ? signatur : existing.UnterschriftMitarbeiter,
      it: typ === 'it' ? signatur : existing.UnterschriftIT,
    };

    // Wenn beide Unterschriften vorhanden -> Status auf UNTERSCHRIEBEN setzen
    if (afterUpdate.mitarbeiter && afterUpdate.it) {
      updateData.Status = 'UNTERSCHRIEBEN';
      updateData.UnterschriftDatum = new Date();
    } else {
      // Mindestens Status auf OFFEN setzen
      updateData.Status = 'OFFEN';
    }

    const updated = await prisma.uebergabeProtokoll.update({
      where: { ID: protocolId },
      data: updateData,
    });

    // Wenn vollständig unterschrieben -> Aktionen anwenden (Zuordnen/Rückgabe)
    if (updateData.Status === 'UNTERSCHRIEBEN' && updated.Status === 'UNTERSCHRIEBEN') {
      await applyProtocolEffects(protocolId);
    }

    return NextResponse.json({
      success: true,
      message: `${typ === 'mitarbeiter' ? 'Mitarbeiter' : 'IT'}-Unterschrift gespeichert`,
      vollstaendig: !!afterUpdate.mitarbeiter && !!afterUpdate.it,
    });
  } catch (error) {
    console.error('Error signing protocol:', error);
    return NextResponse.json({ error: 'Fehler beim Speichern der Unterschrift' }, { status: 500 });
  }
}
