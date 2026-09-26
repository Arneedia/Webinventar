import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';
import { bereichWhere } from '@/lib/masterDataBereich';

// Modelle abrufen (aus MOD-Tabelle mit HS_MOD-Zuordnungen + unique Liste aus BueroInventar)
export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.OFFICE_INVENTORY_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const kategorieId = searchParams.get('kategorieId');
    const hersteller = searchParams.get('hersteller');
    const herstellerId = searchParams.get('herstellerId');
    const search = searchParams.get('search');
    const includeAll = searchParams.get('includeAll') === 'true';

    // includeAll=true: alle Modelle des Büro-Bereichs aus MOD (optional auf einen Hersteller via HS_MOD eingeschränkt)
    if (includeAll) {
      const hsId = herstellerId ? parseInt(herstellerId) : null;

      const mods = hsId
        ? (
            await prisma.hS_MOD.findMany({
              where: { HSID: hsId, MOD: bereichWhere('BUERO') },
              include: { MOD: true },
            })
          ).map((rel) => rel.MOD)
        : await prisma.mOD.findMany({ where: bereichWhere('BUERO') });

      let models = mods.map((mod) => ({
        id: mod.ModID,
        name: mod.ModName || `Modell ${mod.ModID}`,
        nummer: mod.ModellNummer,
      }));

      // Filter nach Suchbegriff
      if (search) {
        const searchLower = search.toLowerCase();
        models = models.filter(
          (m) =>
            m.name.toLowerCase().includes(searchLower) ||
            (m.nummer && m.nummer.toLowerCase().includes(searchLower))
        );
      }

      models.sort((a, b) => a.name.localeCompare(b.name, 'de'));

      return NextResponse.json({ models });
    }

    // Ansonsten: Hole eindeutige Modelle aus BueroInventar
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
