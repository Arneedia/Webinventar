import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/apiError';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';
import { validateWODISNumber } from '@/lib/wodisNumber';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH: Update device data
export async function PATCH(req: NextRequest, context: RouteContext) {
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
    const { SNO, EAN, IMEI1, IMEI2, Preis, HWID, HSID, MODID, StandardRaumID, WODISNr } = body;

    // Build update data object with only provided fields
    const updateData: any = {};
    
    if (SNO !== undefined) updateData.SNO = SNO;
    if (EAN !== undefined) updateData.EAN = EAN;
    if (IMEI1 !== undefined) updateData.IMEI1 = IMEI1;
    if (IMEI2 !== undefined) updateData.IMEI2 = IMEI2;
    if (Preis !== undefined) updateData.Preis = Preis;
    if (HWID !== undefined) updateData.HWID = HWID;
    if (HSID !== undefined) updateData.HSID = HSID;
    if (MODID !== undefined) updateData.MODID = MODID;
    if (StandardRaumID !== undefined) updateData.StandardRaumID = StandardRaumID;
    
    // Handle WODISNr update with validation
    if (WODISNr !== undefined) {
      if (WODISNr === null || WODISNr === '') {
        updateData.WODISNr = null;
      } else {
        if (!validateWODISNumber(WODISNr)) {
          return NextResponse.json(
            { error: 'Ungültige WODIS Nr. Format: JJJJNNNNNN (z.B. 2026000001)' },
            { status: 400 }
          );
        }
        // Check if WODIS Nr. is already used by another device
        const existingDevice = await prisma.gER.findUnique({
          where: { WODISNr: WODISNr },
        });
        if (existingDevice && existingDevice.GerID !== deviceId) {
          return NextResponse.json(
            { error: 'Diese WODIS Nr. wird bereits von einem anderen Gerät verwendet' },
            { status: 409 }
          );
        }
        updateData.WODISNr = WODISNr;
      }
    }

    // Raumänderung über das Bearbeiten-Formular ebenfalls als Bewegung protokollieren
    const roomChanged = StandardRaumID !== undefined;
    const oldDevice = roomChanged
      ? await prisma.gER.findUnique({ where: { GerID: deviceId }, select: { StandardRaumID: true } })
      : null;

    const updatedDevice = await prisma.gER.update({
      where: { GerID: deviceId },
      data: updateData,
    });

    if (oldDevice && oldDevice.StandardRaumID !== updateData.StandardRaumID) {
      await prisma.gerBewegung.create({
        data: {
          GerID: deviceId,
          Typ: 'STANDORTWECHSEL',
          VonRaumID: oldDevice.StandardRaumID,
          NachRaumID: updateData.StandardRaumID,
          Bemerkung: 'Raum geändert',
        },
      });
    }

    return NextResponse.json({ success: true, device: updatedDevice });
  } catch (error) {
    console.error('Database error (PATCH /api/devices/[id]):', error);
    return apiErrorResponse(error);
  }
}
