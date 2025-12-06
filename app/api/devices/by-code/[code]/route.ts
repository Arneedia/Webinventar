import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

interface RouteContext {
  params: Promise<{ code: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.DEVICES_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { code } = await context.params;

    const device = await prisma.gER.findFirst({
      where: { InventarCode: code },
      include: {
        HW: true,
        HS: true,
        MOD: true,
        RAUM: true,
        BenutzerGER: {
          orderBy: { Start: 'desc' },
          include: {
            Benutzer: {
              include: {
                ABT: true,
                STAT: true,
                GS: true,
              },
            },
          },
        },
        ZubehoerBenutzer: {
          orderBy: { Start: 'desc' },
          include: {
            Zubehoer: {
              include: {
                ZT: true,
                HS: true,
                MOD: true,
              },
            },
            Benutzer: true,
          },
        },
      },
    });

    if (!device) {
      return NextResponse.json({ error: 'Gerät nicht gefunden' }, { status: 404 });
    }

    // Aktueller Benutzer (ohne Ende-Datum)
    const currentAssignment = device.BenutzerGER.find((a) => !a.Ende);
    const currentUser = currentAssignment?.Benutzer;

    // Verlauf (alle Zuordnungen)
    const history = device.BenutzerGER.map((a) => ({
      id: a.ID,
      benutzerId: a.BenutzerID,
      benutzerName: a.Benutzer?.BenutzerName ?? null,
      start: a.Start,
      ende: a.Ende,
    }));

    // Zubehör
    const accessories = device.ZubehoerBenutzer.map((zb) => ({
      id: zb.ID,
      zubehoerId: zb.ZubehoerID,
      zubehoerTyp: zb.Zubehoer?.ZT?.ZTName ?? null,
      zubehoerHersteller: zb.Zubehoer?.HS?.HSName ?? null,
      zubehoerModell: zb.Zubehoer?.MOD?.ModName ?? null,
      beschreibung: zb.Zubehoer?.Beschreibung ?? null,
      benutzerId: zb.BenutzerID,
      benutzerName: zb.Benutzer?.BenutzerName ?? null,
      start: zb.Start,
      ende: zb.Ende,
      status: zb.Ende ? 'RETURNED' : 'ACTIVE',
    }));

    // Basis-Objekt (gleich wie in /api/devices)
    const baseDevice = {
      id: device.GerID,
      inventarCode: device.InventarCode,
      sno: device.SNO,
      zugang: device.Zugang,
      abgang: device.Abgang,
      hwName: device.HW?.HWName ?? null,
      hwCode: device.HW?.HWCode ?? null,
      hsName: device.HS?.HSName ?? null,
      modelName: device.MOD?.ModName ?? null,
      preis: device.Preis ? Number(device.Preis as any) : null,
      ean: device.EAN ?? null,
      imei1: device.IMEI1 ?? null,
      imei2: device.IMEI2 ?? null,
      test: device.Test ?? null,
      testGruppe: device.TestGruppe ?? null,
      // Gleiche Felder wie DeviceListItem
      currentUserId: currentUser?.BenutzerID ?? null,
      currentUserName: currentUser?.BenutzerName ?? null,
      // Raum-Informationen
      raumId: device.RaumID,
      raumName: device.RAUM?.RaumName ?? null,
      raumStandort: device.RAUM?.Standort ?? null,
      // Effektiver Raum: Benutzer-Raum hat Vorrang vor Geräte-Raum
      effectiveRoom: currentUser?.BenutzerRaum ?? device.RAUM?.RaumName ?? null,
    };

    return NextResponse.json({
      ...baseDevice,
      // Zusätzliche Details für die Detailseite
      currentUser: currentUser
        ? {
            id: currentUser.BenutzerID,
            name: currentUser.BenutzerName,
            raum: currentUser.BenutzerRaum,
            abteilung: currentUser.ABT?.ABTName ?? null,
            status: currentUser.STAT?.StatusName ?? null,
            geschaeftsstelle: currentUser.GS?.GSName ?? null,
            assignedSince: currentAssignment?.Start,
          }
        : null,
      history,
      accessories,
    });
  } catch (error) {
    console.error('Error fetching device by code:', error);
    return NextResponse.json({ error: 'Datenbankfehler' }, { status: 500 });
  }
}
