import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceIds, userId } = body;

    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
      return NextResponse.json(
        { error: 'Keine Geräte ausgewählt' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Kein Benutzer ausgewählt' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const deviceId of deviceIds) {
      try {
        // Prüfe ob Gerät existiert und aktiv ist
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

        if (device.BenutzerGER.length > 0) {
          errors.push({ deviceId, error: 'Gerät ist bereits zugewiesen' });
          continue;
        }

        // Erstelle neue Zuweisung
        await prisma.benutzerGER.create({
          data: {
            BenutzerID: userId,
            GERID: deviceId,
            Start: new Date().toISOString(),
            Ende: null,
          },
        });

        results.push({ deviceId, success: true });
      } catch (err) {
        console.error(`Fehler bei Gerät ${deviceId}:`, err);
        errors.push({ deviceId, error: 'Fehler bei Zuweisung' });
      }
    }

    return NextResponse.json({
      success: results.length,
      failed: errors.length,
      results,
      errors,
    });
  } catch (error) {
    console.error('Fehler bei Bulk-Zuweisung:', error);
    return NextResponse.json(
      { error: 'Fehler bei Bulk-Zuweisung' },
      { status: 500 }
    );
  }
}
