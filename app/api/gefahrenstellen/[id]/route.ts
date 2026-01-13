import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const gefahrenstelleId = Number(id);

  if (!Number.isFinite(gefahrenstelleId)) {
    return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 });
  }

  try {
    const { Name, Beschreibung } = await req.json();

    if (!Name?.trim()) {
      return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 });
    }

    const gefahrenstelle = await prisma.gefahrenstelle.update({
      where: { GefahrenstelleID: gefahrenstelleId },
      data: {
        Name: Name.trim(),
        Beschreibung: Beschreibung?.trim() || null,
      },
    });

    return NextResponse.json({ gefahrenstelle });
  } catch (error) {
    console.error('Error in PUT /api/gefahrenstellen/[id]:', error);
    return NextResponse.json({ error: 'Gefahrenstelle konnte nicht aktualisiert werden' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const gefahrenstelleId = Number(id);

  if (!Number.isFinite(gefahrenstelleId)) {
    return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 });
  }

  try {
    await prisma.gefahrenstelle.delete({
      where: { GefahrenstelleID: gefahrenstelleId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/gefahrenstellen/[id]:', error);
    return NextResponse.json({ error: 'Gefahrenstelle konnte nicht gelöscht werden' }, { status: 500 });
  }
}
