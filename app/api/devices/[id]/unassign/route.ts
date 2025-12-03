import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const deviceId = Number(id);
    if (Number.isNaN(deviceId)) {
      return NextResponse.json({ error: 'Ungültige Geräte-ID' }, { status: 400 });
    }

    const now = new Date();

    // Offene Zuordnung(en) beenden
    await prisma.benutzerGER.updateMany({
      where: {
        GERID: deviceId,
        Ende: null,
      },
      data: {
        Ende: now,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database error (POST /api/devices/[id]/unassign):', error);
    return NextResponse.json({ error: 'Datenbankfehler', details: String(error) }, { status: 500 });
  }
}
