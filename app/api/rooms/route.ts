import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';

export async function GET() {
  try {
    const rooms = await prisma.rAUM.findMany({
      include: {
        GS: true,
        RaumGefahrenstellen: {
          include: {
            Gefahrenstelle: true,
          },
        },
      },
      orderBy: { RaumName: 'asc' },
    });
    return NextResponse.json({ rooms });
  } catch (error) {
    console.error('Error in GET /api/rooms:', error);
    return NextResponse.json({ error: 'Räume konnten nicht geladen werden' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { RaumName, Standort, Notiz, GSID, gefahrenstellen } = await req.json();

    const room = await prisma.rAUM.create({
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

    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/rooms:', error);
    return NextResponse.json({ error: 'Raum konnte nicht angelegt werden' }, { status: 500 });
  }
}
