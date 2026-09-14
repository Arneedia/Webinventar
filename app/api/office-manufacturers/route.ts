import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

// Hersteller abrufen (unique Liste aus BueroInventar)
export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.DEVICES_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const kategorieId = searchParams.get('kategorieId');
    const search = searchParams.get('search');

    // Hole alle eindeutigen Hersteller
    const whereClause: any = {
      Hersteller: { not: null },
    };

    if (kategorieId) {
      whereClause.KategorieID = parseInt(kategorieId);
    }

    if (search) {
      whereClause.Hersteller = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const items = await prisma.bueroInventar.findMany({
      where: whereClause,
      select: {
        Hersteller: true,
        KategorieID: true,
      },
      distinct: ['Hersteller'],
      orderBy: {
        Hersteller: 'asc',
      },
    });

    const manufacturers = items
      .filter((item) => item.Hersteller)
      .map((item) => ({
        name: item.Hersteller,
        kategorieId: item.KategorieID,
      }));

    return NextResponse.json({ manufacturers });
  } catch (error) {
    console.error('Error in GET /api/office-manufacturers:', error);
    return NextResponse.json({ error: 'Fehler beim Laden der Hersteller' }, { status: 500 });
  }
}
