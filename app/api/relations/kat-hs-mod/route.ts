import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

// Kategorie ↔ Hersteller-Modell Zuordnungen (Büroinventar) abrufen
export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.MASTER_DATA_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const relations = await prisma.kAT_HS_MOD.findMany({
      include: { Kategorie: true, HsMod: { include: { HS: true, MOD: true } } },
      orderBy: [{ KategorieID: 'asc' }, { HSID: 'asc' }, { ModID: 'asc' }],
    });
    return NextResponse.json({
      relations: relations.map((rel) => ({
        KategorieID: rel.KategorieID,
        HSID: rel.HSID,
        ModID: rel.ModID,
        kategorieName: rel.Kategorie.Name,
        hsName: rel.HsMod.HS.HSName,
        modName: rel.HsMod.MOD.ModName,
        modellNummer: rel.HsMod.MOD.ModellNummer,
      })),
    });
  } catch (error) {
    console.error('Error in GET /api/relations/kat-hs-mod:', error);
    return NextResponse.json({ error: 'Zuordnungen konnten nicht geladen werden' }, { status: 500 });
  }
}

// Eine Kategorie mit einem oder mehreren Hersteller-Modell-Paaren verknüpfen
export async function POST(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.MASTER_DATA_EDIT);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const kategorieId = Number(body.KategorieID);
    const pairs: { HSID: number; ModID: number }[] = (Array.isArray(body.pairs) ? body.pairs : [])
      .map((p: { HSID?: unknown; ModID?: unknown }) => ({ HSID: Number(p?.HSID), ModID: Number(p?.ModID) }))
      .filter((p: { HSID: number; ModID: number }) => Number.isInteger(p.HSID) && Number.isInteger(p.ModID));

    if (!Number.isInteger(kategorieId) || pairs.length === 0) {
      return NextResponse.json(
        { error: 'Bitte eine Kategorie und mindestens eine Hersteller-Modell-Zuordnung auswählen' },
        { status: 400 }
      );
    }

    const existingPairs = await prisma.hS_MOD.count({
      where: { OR: pairs.map((p) => ({ HSID: p.HSID, ModID: p.ModID })) },
    });
    if (existingPairs !== pairs.length) {
      return NextResponse.json({ error: 'Mindestens eine Hersteller-Modell-Zuordnung existiert nicht' }, { status: 400 });
    }

    const { count } = await prisma.kAT_HS_MOD.createMany({
      data: pairs.map((p) => ({ KategorieID: kategorieId, HSID: p.HSID, ModID: p.ModID })),
      skipDuplicates: true,
    });

    return NextResponse.json({ success: true, created: count, skipped: pairs.length - count }, { status: 201 });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2003') {
      return NextResponse.json({ error: 'Kategorie nicht gefunden' }, { status: 400 });
    }
    console.error('Error in POST /api/relations/kat-hs-mod:', error);
    return NextResponse.json({ error: 'Zuordnung konnte nicht erstellt werden' }, { status: 500 });
  }
}
