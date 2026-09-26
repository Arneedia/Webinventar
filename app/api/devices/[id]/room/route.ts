import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Raum eines Geräts ändern
export async function PUT(req: NextRequest, context: RouteContext) {
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
    const { raumId } = body;

    // Gerät prüfen
    const device = await prisma.gER.findUnique({
      where: { GerID: deviceId },
    });

    if (!device) {
      return NextResponse.json({ error: 'Gerät nicht gefunden' }, { status: 404 });
    }

    // Raum prüfen (wenn angegeben)
    if (raumId !== null && raumId !== undefined) {
      const room = await prisma.rAUM.findUnique({
        where: { RaumID: Number(raumId) },
      });
      if (!room) {
        return NextResponse.json({ error: 'Raum nicht gefunden' }, { status: 404 });
      }
    }

    const newRaumId = raumId !== null && raumId !== undefined ? Number(raumId) : null;
    if (device.StandardRaumID === newRaumId) {
      return NextResponse.json({ success: true, changed: false });
    }

    // Raum aktualisieren (Standard-Raum des Geräts) und Bewegung protokollieren
    await prisma.$transaction([
      prisma.gER.update({
        where: { GerID: deviceId },
        data: { StandardRaumID: newRaumId },
      }),
      prisma.gerBewegung.create({
        data: {
          GerID: deviceId,
          Typ: 'STANDORTWECHSEL',
          VonRaumID: device.StandardRaumID,
          NachRaumID: newRaumId,
          Bemerkung: 'Raum geändert',
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating device room:', error);
    return NextResponse.json({ error: 'Datenbankfehler' }, { status: 500 });
  }
}
