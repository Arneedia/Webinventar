import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const roomId = Number(id);

  if (!Number.isFinite(roomId)) {
    return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 });
  }

  try {
    const { RaumName, Standort, Notiz, GSID, gefahrenstellen } = await req.json();

    // Delete existing Gefahrenstellen associations
    await prisma.raumGefahrenstelle.deleteMany({
      where: { RaumID: roomId },
    });

    // Update room with new data
    const room = await prisma.rAUM.update({
      where: { RaumID: roomId },
      data: {
        RaumName,
        Standort,
        Notiz,
        GSID,
        RaumGefahrenstellen: {
          create: (gefahrenstellen || []).map((ghId: number) => ({
            GefahrenstelleID: ghId,
          })),
        },
      },
      include: {
        GS: true,
        RaumGefahrenstellen: {
          include: {
            Gefahrenstelle: true,
          },
        },
      },
    });

    return NextResponse.json({ room });
  } catch (error) {
    console.error('Error in PUT /api/rooms/[id]:', error);
    return NextResponse.json({ error: 'Raum konnte nicht aktualisiert werden' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const roomId = Number(id);

  if (!Number.isFinite(roomId)) {
    return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 });
  }

  try {
    await prisma.rAUM.delete({
      where: { RaumID: roomId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/rooms/[id]:', error);
    return NextResponse.json({ error: 'Raum konnte nicht gelöscht werden' }, { status: 500 });
  }
}
