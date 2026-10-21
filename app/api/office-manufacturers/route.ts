import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/apiError';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';
import { bereichWhere } from '@/lib/masterDataBereich';

// Hersteller abrufen (aus HS-Tabelle + unique Liste aus BueroInventar)
export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.OFFICE_INVENTORY_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const kategorieId = searchParams.get('kategorieId');
    const search = searchParams.get('search');
    const includeAll = searchParams.get('includeAll') === 'true';

    // Wenn includeAll=true, hole alle Hersteller für das Büroinventar aus HS-Tabelle
    if (includeAll) {
      const whereClause: any = bereichWhere('BUERO');
      
      if (search) {
        whereClause.HSName = {
          contains: search,
          mode: 'insensitive',
        };
      }

      const hsRecords = await prisma.hS.findMany({
        where: whereClause,
        orderBy: {
          HSName: 'asc',
        },
      });

      const manufacturers = hsRecords.map((hs) => ({
        id: hs.HSID,
        name: hs.HSName || `Hersteller ${hs.HSID}`,
      }));

      return NextResponse.json({ manufacturers });
    }

    // Ansonsten: Hole eindeutige Hersteller aus BueroInventar
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
    return apiErrorResponse(error, 'Fehler beim Laden der Hersteller');
  }
}
