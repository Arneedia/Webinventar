import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/apiError';
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

    const body = await req.json().catch(() => ({}));
    const accessoryActions = body.accessoryActions as Record<number, 'retire' | 'return'> | undefined;

    const now = new Date();

    const device = await prisma.gER.findUnique({
      where: { GerID: deviceId },
      include: { BenutzerGER: { where: { Ende: null } } },
    });
    if (!device) {
      return NextResponse.json({ error: 'Gerät nicht gefunden' }, { status: 404 });
    }

    // Gerät ausbuchen, offene Zuordnung beenden und Bewegung protokollieren
    await prisma.$transaction([
      prisma.gER.update({
        where: { GerID: deviceId },
        data: { Abgang: now },
      }),
      prisma.benutzerGER.updateMany({
        where: { GERID: deviceId, Ende: null },
        data: { Ende: now },
      }),
      prisma.gerBewegung.create({
        data: {
          GerID: deviceId,
          Typ: 'ABGANG',
          VonBenutzerID: device.BenutzerGER[0]?.BenutzerID ?? null,
          NachBenutzerID: null,
          VonRaumID: device.StandardRaumID,
          NachRaumID: device.StandardRaumID,
          Bemerkung: 'Gerät abgeschrieben',
        },
      }),
    ]);

    // Zubehör-Aktionen verarbeiten
    if (accessoryActions && Object.keys(accessoryActions).length > 0) {
      for (const [accessoryIdStr, action] of Object.entries(accessoryActions)) {
        const accessoryId = Number(accessoryIdStr);
        
        if (action === 'retire') {
          // Zubehör auch ausbuchen: Ende-Datum setzen und Status auf RETURNED
          await prisma.zubehoerBenutzer.updateMany({
            where: {
              ZubehoerID: accessoryId,
              GerID: deviceId,
              Ende: null,
            },
            data: {
              Ende: now,
            },
          });
        } else if (action === 'return') {
          // Zubehör zurück ins Inventar: Zuweisung beenden
          await prisma.zubehoerBenutzer.updateMany({
            where: {
              ZubehoerID: accessoryId,
              GerID: deviceId,
              Ende: null,
            },
            data: {
              Ende: now,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database error (POST /api/devices/[id]/retire):', error);
    return apiErrorResponse(error);
  }
}
