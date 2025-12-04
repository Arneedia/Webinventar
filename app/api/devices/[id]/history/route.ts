import { NextRequest, NextResponse } from 'next/server';
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
      include: { Benutzer: true },
      orderBy: { Start: 'desc' },
    });

    const history = entries.map((e) => ({
      id: e.ID,
      benutzerId: e.BenutzerID,
      benutzerName: e.Benutzer?.BenutzerName ?? null,
      start: e.Start,
      ende: e.Ende,
    }));

    return NextResponse.json(history);
  } catch (error) {
    console.error('Database error (GET /api/devices/[id]/history):', error);
    return NextResponse.json({ error: 'Datenbankfehler', details: String(error) }, { status: 500 });
  }
}
