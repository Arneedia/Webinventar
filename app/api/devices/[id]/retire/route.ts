import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.DEVICES_DELETE);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const deviceId = Number(id);
    if (Number.isNaN(deviceId)) {
      return NextResponse.json({ error: 'Ungültige Geräte-ID' }, { status: 400 });
    }

    const now = new Date();

    await prisma.gER.update({
      where: { GerID: deviceId },
      data: { Abgang: now },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database error (POST /api/devices/[id]/retire):', error);
    return NextResponse.json({ error: 'Datenbankfehler', details: String(error) }, { status: 500 });
  }
}
