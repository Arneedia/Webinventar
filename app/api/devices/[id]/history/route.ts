import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/apiError';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.DEVICES_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const deviceId = Number(id);
    if (Number.isNaN(deviceId)) {
      return NextResponse.json({ error: 'Ungültige Geräte-ID' }, { status: 400 });
    }

    const entries = await prisma.benutzerGER.findMany({
      where: { GERID: deviceId },
      select: {
        ID: true,
        BenutzerID: true,
        Start: true,
        Ende: true,
        Benutzer: {
          select: {
            BenutzerName: true,
            RAUM: {
              select: {
                RaumID: true,
                RaumName: true,
              },
            },
          },
        },
      },
      orderBy: { Start: 'desc' },
    });

    const history = entries.map((e) => ({
      id: e.ID,
      benutzerId: e.BenutzerID,
      benutzerName: e.Benutzer?.BenutzerName ?? null,
      start: e.Start,
      ende: e.Ende,
      roomId: e.Benutzer?.RAUM?.RaumID ?? null,
      roomName: e.Benutzer?.RAUM?.RaumName ?? null,
    }));

    // Bewegungshistorie (Raum- und Benutzerwechsel, analog Büroinventar)
    const movements = await prisma.gerBewegung.findMany({
      where: { GerID: deviceId },
      include: { VonBenutzer: true, NachBenutzer: true },
      orderBy: { ID: 'desc' },
    });

    return NextResponse.json({
      entries: history,
      movements: movements.map((m) => ({
        id: m.ID,
        typ: m.Typ,
        vonBenutzerId: m.VonBenutzerID,
        nachBenutzerId: m.NachBenutzerID,
        vonBenutzerName: m.VonBenutzer?.BenutzerName ?? null,
        nachBenutzerName: m.NachBenutzer?.BenutzerName ?? null,
        vonRaumId: m.VonRaumID,
        nachRaumId: m.NachRaumID,
        bemerkung: m.Bemerkung,
        zeitpunkt: m.Zeitpunkt,
      })),
    });
  } catch (error) {
    console.error('Database error (GET /api/devices/[id]/history):', error);
    return apiErrorResponse(error);
  }
}
