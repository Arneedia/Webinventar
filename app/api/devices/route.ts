import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';

// Liste aller Geräte mit aktuellen Zuordnungen
export async function GET() {
  try {
    const devices = await prisma.gER.findMany({
      include: {
        HW: true,
        HS: true,
        MOD: true,
        BenutzerGER: {
          where: { Ende: null },
          orderBy: { Start: 'desc' },
          take: 1,
          include: { Benutzer: true },
        },
      },
    });

    const data = devices.map((d) => {
      const currentAssignment = d.BenutzerGER[0];
      return {
        id: d.GerID,
        sno: d.SNO,
        zugang: d.Zugang,
        abgang: d.Abgang,
        hwName: d.HW?.HWName ?? null,
        hsName: d.HS?.HSName ?? null,
        modelName: d.MOD?.ModName ?? null,
        preis: d.Preis ? Number(d.Preis as any) : null,
        ean: d.EAN ?? null,
        imei1: d.IMEI1 ?? null,
        imei2: d.IMEI2 ?? null,
        test: d.Test ?? null,
        testGruppe: d.TestGruppe ?? null,
        currentUserId: currentAssignment?.BenutzerID ?? null,
        currentUserName: currentAssignment?.Benutzer?.BenutzerName ?? null,
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Database error (GET /api/devices):', error);
    return NextResponse.json({ error: 'Datenbankfehler', details: String(error) }, { status: 500 });
  }
}
