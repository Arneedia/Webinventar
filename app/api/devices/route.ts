import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

// Liste aller Geräte mit aktuellen Zuordnungen
export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.DEVICES_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const devices = await prisma.gER.findMany({
      include: {
        HW: true,
        HS: true,
        MOD: true,
        RAUM: true,
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
      const currentUser = currentAssignment?.Benutzer;
      // Raum: Wenn Benutzer zugewiesen -> Benutzer-Raum, sonst Geräte-Raum
      const effectiveRoom = currentUser?.BenutzerRaum ?? d.RAUM?.RaumName ?? null;
      return {
        id: d.GerID,
        inventarCode: d.InventarCode,
        sno: d.SNO,
        zugang: d.Zugang,
        abgang: d.Abgang,
        hwName: d.HW?.HWName ?? null,
        hwCode: d.HW?.HWCode ?? null,
        hsName: d.HS?.HSName ?? null,
        modelName: d.MOD?.ModName ?? null,
        preis: d.Preis ? Number(d.Preis as any) : null,
        ean: d.EAN ?? null,
        imei1: d.IMEI1 ?? null,
        imei2: d.IMEI2 ?? null,
        currentUserId: currentAssignment?.BenutzerID ?? null,
        currentUserName: currentUser?.BenutzerName ?? null,
        // Raum-Informationen
        raumId: d.RaumID,
        raumName: d.RAUM?.RaumName ?? null,
        effectiveRoom, // Benutzer-Raum oder Geräte-Raum
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Database error (GET /api/devices):', error);
    return NextResponse.json({ error: 'Datenbankfehler', details: String(error) }, { status: 500 });
  }
}
