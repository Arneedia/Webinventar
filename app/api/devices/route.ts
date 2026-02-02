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
        StandardRaum: {
          include: {
            GS: true,
            RaumGefahrenstellen: {
              include: {
                Gefahrenstelle: true,
              },
            },
          },
        },
        BenutzerGER: {
          where: { Ende: null },
          orderBy: { Start: 'desc' },
          take: 1,
          include: {
            Benutzer: {
              include: {
                RAUM: true,
              },
            },
          },
        },
      },
    });

    const data = devices.map((d) => {
      const currentAssignment = d.BenutzerGER[0];
      const currentUser = currentAssignment?.Benutzer;
      // Raum: Wenn Benutzer zugewiesen -> Benutzer-RAUM, sonst Geräte-StandardRaum
      const effectiveRoom = currentUser?.RAUM?.RaumName ?? d.StandardRaum?.RaumName ?? null;
      const effectiveRoomSource = currentUser?.RAUM
        ? 'user'
        : d.StandardRaum
          ? 'device'
          : null;
      const roomHazards =
        d.StandardRaum?.RaumGefahrenstellen?.map((rg) => ({
          id: rg.GefahrenstelleID,
          name: rg.Gefahrenstelle?.Name ?? '',
        })) ?? [];
      return {
        id: d.GerID,
        inventarCode: d.InventarCode,
        wodisNr: (d as any).WODISNr ?? null,
        sno: d.SNO,
        zugang: d.Zugang,
        abgang: d.Abgang,
        hwId: d.HWID ?? null,
        hwName: d.HW?.HWName ?? null,
        hwCode: d.HW?.HWCode ?? null,
        hsId: d.HSID ?? null,
        hsName: d.HS?.HSName ?? null,
        modelId: d.MODID ?? null,
        modelName: d.MOD?.ModName ?? null,
        preis: d.Preis ? Number(d.Preis as any) : null,
        ean: d.EAN ?? null,
        imei1: d.IMEI1 ?? null,
        imei2: d.IMEI2 ?? null,
        currentUserId: currentAssignment?.BenutzerID ?? null,
        currentUserName: currentUser?.BenutzerName ?? null,
        // Raum-Informationen
        raumId: d.StandardRaumID ?? null,
        raumName: d.StandardRaum?.RaumName ?? null,
        raumStandort: d.StandardRaum?.Standort ?? null,
        raumNotiz: d.StandardRaum?.Notiz ?? null,
        raumBranch: d.StandardRaum?.GS?.GSName ?? null,
        raumBranchCity: d.StandardRaum?.GS?.GSOrt ?? null,
        raumHazards: roomHazards,
        effectiveRoom, // Benutzer-Raum oder Geräte-StandardRaum
        effectiveRoomSource,
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Database error (GET /api/devices):', error);
    return NextResponse.json({ error: 'Datenbankfehler', details: String(error) }, { status: 500 });
  }
}
