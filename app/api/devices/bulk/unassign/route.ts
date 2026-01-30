import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceIds, roomId } = body;

    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
      return NextResponse.json(
        { error: 'Keine Geräte ausgewählt' },
        { status: 400 }
      );
    }

    if (!roomId) {
      return NextResponse.json(
        { error: 'Kein Raum ausgewählt' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const deviceId of deviceIds) {
      try {
        // Finde aktive Zuweisung
        const activeAssignment = await prisma.benutzerGER.findFirst({
          where: {
            GERID: deviceId,
            Ende: null,
          },
        });

        if (!activeAssignment) {
          errors.push({ deviceId, error: 'Keine aktive Zuweisung gefunden' });
          continue;
        }

        // Beende Zuweisung
        await prisma.benutzerGER.update({
          where: { ID: activeAssignment.ID },
          data: { Ende: new Date().toISOString() },
        });

        // Setze Raum für Gerät
        await prisma.gER.update({
          where: { GerID: deviceId },
          data: { StandardRaumID: roomId },
        });

        results.push({ deviceId, success: true });
      } catch (err) {
        console.error(`Fehler bei Gerät ${deviceId}:`, err);
        errors.push({ deviceId, error: 'Fehler bei Rückgabe' });
      }
    }

    return NextResponse.json({
      success: results.length,
      failed: errors.length,
      results,
      errors,
    });
  } catch (error) {
    console.error('Fehler bei Bulk-Rückgabe:', error);
    return NextResponse.json(
      { error: 'Fehler bei Bulk-Rückgabe' },
      { status: 500 }
    );
  }
}
