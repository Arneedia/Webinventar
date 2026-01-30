import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';
import QRCode from 'qrcode';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.DEVICES_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const deviceId = Number(id);

    if (Number.isNaN(deviceId)) {
      return NextResponse.json({ error: 'Ungültige Geräte-ID' }, { status: 400 });
    }

    const device = await prisma.gER.findUnique({
      where: { GerID: deviceId },
      include: {
        HW: true,
        HS: true,
        MOD: true,
      },
    });

    if (!device) {
      return NextResponse.json({ error: 'Gerät nicht gefunden' }, { status: 404 });
    }

    // URL für QR-Code: Gerätedetailseite (dynamisch aus Request ermitteln)
    const url = new URL(req.url);
    const baseUrl = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host;
    const protocol = req.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
    const deviceUrl = `${protocol}://${baseUrl}/geraete/${device.InventarCode}`;

    // QR-Code als Data-URL generieren
    const qrDataUrl = await QRCode.toDataURL(deviceUrl, {
      width: 200,
      margin: 1,
      errorCorrectionLevel: 'M',
    });

    return NextResponse.json({
      device: {
        id: device.GerID,
        inventarCode: device.InventarCode,
        sno: device.SNO,
        hwName: device.HW?.HWName ?? null,
        hsName: device.HS?.HSName ?? null,
        modelName: device.MOD?.ModName ?? null,
      },
      qrCode: qrDataUrl,
      url: deviceUrl,
    });
  } catch (error) {
    console.error('Error generating sticker:', error);
    return NextResponse.json({ error: 'Fehler beim Generieren des Stickers' }, { status: 500 });
  }
}
