import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.DEVICES_EDIT);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const deviceId = Number(id);
    if (Number.isNaN(deviceId)) {
      return NextResponse.json({ error: 'Ungültige Geräte-ID' }, { status: 400 });
    }

    const body = await req.json();
    const benutzerId = Number(body.benutzerId);
    if (!benutzerId || Number.isNaN(benutzerId)) {
      return NextResponse.json({ error: 'Ungültige Benutzer-ID' }, { status: 400 });
    }

    const now = new Date();

    const device = await prisma.gER.findUnique({
      where: { GerID: deviceId },
      include: { BenutzerGER: { where: { Ende: null } } },
    });
    if (!device) {
      return NextResponse.json({ error: 'Gerät nicht gefunden' }, { status: 404 });
    }
    const prevBenutzerId = device.BenutzerGER[0]?.BenutzerID ?? null;

    try {
      await prisma.$transaction(async (tx) => {
        // Bestehende offene Zuordnung(en) beenden
        await tx.benutzerGER.updateMany({
          where: { GERID: deviceId, Ende: null },
          data: { Ende: now },
        });
        // Neue Zuordnung erstellen
        await tx.benutzerGER.create({
          data: { BenutzerID: benutzerId, GERID: deviceId, Start: now },
        });
        // Bewegung protokollieren (Raum bleibt beim Gerät, analog Büroinventar)
        await tx.gerBewegung.create({
          data: {
            GerID: deviceId,
            Typ: 'ZUWEISUNG',
            VonBenutzerID: prevBenutzerId,
            NachBenutzerID: benutzerId,
            VonRaumID: device.StandardRaumID,
            NachRaumID: device.StandardRaumID,
            Bemerkung: 'Zuordnung geändert',
          },
        });
      });
    } catch (err: unknown) {
      // Häufiger Fall bei nicht synchronisierter Sequence (P2002 auf ID)
      if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002') {
        return NextResponse.json(
          { error: 'Gerät konnte nicht zugewiesen werden (Konflikt). Bitte DB-Sequenz prüfen und erneut versuchen.' },
          { status: 409 },
        );
      }
      throw err;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database error (POST /api/devices/[id]/assign):', error);
    return NextResponse.json({ error: 'Datenbankfehler', details: String(error) }, { status: 500 });
  }
}
