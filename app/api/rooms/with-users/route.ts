import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

// GET: Fetch all rooms with assigned users
export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.DEVICES_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const rooms = await prisma.rAUM.findMany({
      include: {
        Benutzer: {
          select: {
            BenutzerID: true,
            BenutzerName: true,
          },
        },
        GeraeteStandard: {
          where: {
            Abgang: null,
          },
          select: {
            GerID: true,
          },
        },
      },
      orderBy: {
        RaumName: 'asc',
      },
    });

    const roomsWithUsers = rooms.map((room) => ({
      id: room.RaumID,
      name: room.RaumName || '',
      standort: room.Standort || '',
      notiz: room.Notiz || '',
      users: room.Benutzer.map((u) => u.BenutzerName || '').filter(Boolean),
      deviceCount: room.GeraeteStandard.length,
    }));

    return NextResponse.json({ rooms: roomsWithUsers });
  } catch (error) {
    console.error('Database error (GET /api/rooms/with-users):', error);
    return NextResponse.json(
      { error: 'Datenbankfehler', details: String(error) },
      { status: 500 }
    );
  }
}
