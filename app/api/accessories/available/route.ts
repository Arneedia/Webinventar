import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

// GET: Liefert Zubehör, das aktuell niemandem/keinem Gerät zugeordnet ist (keine aktive ZubehoerBenutzer mit Ende = null)
export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.ACCESSORIES_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const accessories = await prisma.zubehoer.findMany({
      where: {
        ZubehoerBenutzer: {
          none: {
            Ende: null,
          },
        },
      },
      select: {
        ZubehoerID: true,
        Beschreibung: true,
        ZT: { select: { ZTName: true } },
        HS: { select: { HSName: true } },
        MOD: { select: { ModName: true } },
      },
      orderBy: { ZubehoerID: 'asc' },
    });

    const data = accessories.map((a) => ({
      id: a.ZubehoerID,
      typ: a.ZT?.ZTName ?? null,
      hersteller: a.HS?.HSName ?? null,
      modell: a.MOD?.ModName ?? null,
      beschreibung: a.Beschreibung ?? null,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching available accessories:', error);
    return NextResponse.json({ error: 'Zubehör konnte nicht geladen werden' }, { status: 500 });
  }
}
