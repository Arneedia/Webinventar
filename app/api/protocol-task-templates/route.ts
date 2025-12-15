import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.PROTOCOLS_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const typ = searchParams.get('typ');

  try {
    const where: any = {};
    if (typ) where.Typ = typ;

    const templates = await (prisma as any).uebergabeAufgabeVorlage.findMany({
      where,
      orderBy: [{ Typ: 'asc' }, { Sortierung: 'asc' }, { ID: 'asc' }],
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error in GET /api/protocol-task-templates:', error);
    return NextResponse.json({ error: 'Vorlagen konnten nicht geladen werden' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.PROTOCOLS_EDIT);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { typ, templates } = body as {
      typ: string;
      templates: Array<{
        id?: number;
        titel: string;
        beschreibung?: string | null;
        faelligInTagen?: number | null;
        sortierung?: number | null;
        aktiv?: boolean | null;
      }>;
    };

    if (!typ || !['AUSGABE', 'RUECKGABE', 'TAUSCH'].includes(typ)) {
      return NextResponse.json({ error: 'Ungültiger Typ' }, { status: 400 });
    }

    if (!Array.isArray(templates)) {
      return NextResponse.json({ error: 'templates muss ein Array sein' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await (tx as any).uebergabeAufgabeVorlage.deleteMany({ where: { Typ: typ } });
      if (templates.length > 0) {
        await (tx as any).uebergabeAufgabeVorlage.createMany({
          data: templates.map((t, idx) => ({
            Typ: typ,
            Titel: t.titel,
            Beschreibung: t.beschreibung ?? null,
            FaelligInTagen: t.faelligInTagen ?? null,
            Sortierung: t.sortierung ?? idx,
            Aktiv: t.aktiv ?? true,
          })),
        });
      }
    });

    return NextResponse.json({ message: 'Vorlagen gespeichert' });
  } catch (error) {
    console.error('Error in PUT /api/protocol-task-templates:', error);
    return NextResponse.json({ error: 'Vorlagen konnten nicht gespeichert werden' }, { status: 500 });
  }
}
