import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/apiError';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET: Liste aller Protokolle für ein bestimmtes Gerät
export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.PROTOCOLS_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const gerID = parseInt(id, 10);

    if (isNaN(gerID)) {
      return NextResponse.json({ error: 'Ungültige Geräte-ID' }, { status: 400 });
    }

    // Finde alle Protokolle, die dieses Gerät enthalten
    const positions = await prisma.uebergabePosition.findMany({
      where: { GerID: gerID },
      include: {
        Protokoll: {
          include: {
            Benutzer: true,
            Ersteller: { select: { name: true } },
          },
        },
      },
      orderBy: { Protokoll: { ErstelltAm: 'desc' } },
    });

    // Deduplizieren (falls ein Gerät mehrfach in einem Protokoll vorkommt)
    const protocolMap = new Map<number, any>();
    for (const pos of positions) {
      if (!protocolMap.has(pos.Protokoll.ID)) {
        protocolMap.set(pos.Protokoll.ID, {
          id: pos.Protokoll.ID,
          protokollNr: pos.Protokoll.ProtokollNr,
          typ: pos.Protokoll.Typ,
          status: pos.Protokoll.Status,
          erstelltAm: pos.Protokoll.ErstelltAm.toISOString(),
          benutzerName: pos.Protokoll.Benutzer?.BenutzerName ?? null,
          erstellerName: pos.Protokoll.Ersteller?.name ?? null,
        });
      }
    }

    return NextResponse.json(Array.from(protocolMap.values()));
  } catch (error) {
    console.error('Error fetching device protocols:', error);
    return apiErrorResponse(error);
  }
}
