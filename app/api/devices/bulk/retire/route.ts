import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceIds } = body;

    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
      return NextResponse.json(
        { error: 'Keine Geräte ausgewählt' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const deviceId of deviceIds) {
      try {
        const device = await prisma.gER.findUnique({
          where: { GerID: deviceId },
          include: {
            BenutzerGER: {
              where: { Ende: null },
            },
          },
        });

        if (!device) {
          errors.push({ deviceId, error: 'Gerät nicht gefunden' });
          continue;
        }

        if (device.Abgang) {
          errors.push({ deviceId, error: 'Gerät ist bereits ausgebucht' });
          continue;
        }

        // Beende aktive Zuweisungen
        if (device.BenutzerGER.length > 0) {
          for (const assignment of device.BenutzerGER) {
            await prisma.benutzerGER.update({
              where: { ID: assignment.ID },
              data: { Ende: new Date().toISOString() },
            });
          }
        }

        // Setze Abgangsdatum
        await prisma.gER.update({
          where: { GerID: deviceId },
          data: { Abgang: new Date() },
        });

        results.push({ deviceId, success: true });
      } catch (err) {
        console.error(`Fehler bei Gerät ${deviceId}:`, err);
        errors.push({ deviceId, error: 'Fehler beim Ausbuchen' });
      }
    }

    return NextResponse.json({
      success: results.length,
      failed: errors.length,
      results,
      errors,
    });
  } catch (error) {
    console.error('Fehler bei Bulk-Ausbuchung:', error);
    return NextResponse.json(
      { error: 'Fehler bei Bulk-Ausbuchung' },
      { status: 500 }
    );
  }
}
