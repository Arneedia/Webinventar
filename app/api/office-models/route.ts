import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

// Modelle abrufen (unique Liste aus BueroInventar)
export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.DEVICES_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const kategorieId = searchParams.get('kategorieId');
    const hersteller = searchParams.get('hersteller');
    const search = searchParams.get('search');

    // Hole alle eindeutigen Modelle
    const whereClause: any = {
      Modell: { not: null },
    };

    if (kategorieId) {
      whereClause.KategorieID = parseInt(kategorieId);
    }

    if (hersteller) {
      whereClause.Hersteller = hersteller;
    }

    if (search) {
      whereClause.Modell = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const items = await prisma.bueroInventar.findMany({
      where: whereClause,
      select: {
        Modell: true,
        Hersteller: true,
        KategorieID: true,
      },
      distinct: ['Modell', 'Hersteller'],
      orderBy: {
        Modell: 'asc',
      },
    });

    const models = items
      .filter((item) => item.Modell)
      .map((item) => ({
        name: item.Modell,
        hersteller: item.Hersteller,
        kategorieId: item.KategorieID,
      }));

    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error in GET /api/office-models:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Modelle' }, { status: 500 });
  }
}
