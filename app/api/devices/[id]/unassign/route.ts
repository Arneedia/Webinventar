import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/apiError';
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
    const { targetRoomId } = body;

    if (!targetRoomId || Number.isNaN(Number(targetRoomId))) {
      return NextResponse.json({ error: 'Ziel-Raum muss angegeben werden' }, { status: 400 });
    }

    const now = new Date();
    const roomId = Number(targetRoomId);

    const device = await prisma.gER.findUnique({
      where: { GerID: deviceId },
      include: { BenutzerGER: { where: { Ende: null } } },
    });
    if (!device) {
      return NextResponse.json({ error: 'Gerät nicht gefunden' }, { status: 404 });
    }
    const prevBenutzerId = device.BenutzerGER[0]?.BenutzerID ?? null;

    await prisma.$transaction(async (tx) => {
      // Offene Zuordnung(en) beenden
      await tx.benutzerGER.updateMany({
        where: { GERID: deviceId, Ende: null },
        data: { Ende: now },
      });

      // StandardRaumID setzen
      await tx.gER.update({
        where: { GerID: deviceId },
        data: { StandardRaumID: roomId },
      });

      // Bewegung protokollieren
      await tx.gerBewegung.create({
        data: {
          GerID: deviceId,
          Typ: 'RUECKGABE',
          VonBenutzerID: prevBenutzerId,
          NachBenutzerID: null,
          VonRaumID: device.StandardRaumID,
          NachRaumID: roomId,
          Bemerkung: 'Zuordnung geändert',
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database error (POST /api/devices/[id]/unassign):', error);
    return apiErrorResponse(error);
  }
}
