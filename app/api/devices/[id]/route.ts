import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

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
    const { SNO, EAN, IMEI1, IMEI2, Preis, HWID, HSID, MODID } = body;

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

    const updatedDevice = await prisma.gER.update({
      where: { GerID: deviceId },
      data: updateData,
    });

    return NextResponse.json({ success: true, device: updatedDevice });
  } catch (error) {
    console.error('Database error (PATCH /api/devices/[id]):', error);
    return NextResponse.json({ error: 'Datenbankfehler', details: String(error) }, { status: 500 });
  }
}
