import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';

export async function GET() {
  try {
    const gefahrenstellen = await prisma.gefahrenstelle.findMany({
      orderBy: { Name: 'asc' },
    });
    return NextResponse.json({ gefahrenstellen });
  } catch (error) {
    console.error('Error in GET /api/gefahrenstellen:', error);
    return NextResponse.json({ error: 'Gefahrenstellen konnten nicht geladen werden' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { Name, Beschreibung } = await req.json();

    if (!Name?.trim()) {
      return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 });
    }

    const gefahrenstelle = await prisma.gefahrenstelle.create({
      data: {
        Name: Name.trim(),
        Beschreibung: Beschreibung?.trim() || null,
      },
    });

    return NextResponse.json({ gefahrenstelle }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/gefahrenstellen:', error);
    return NextResponse.json({ error: 'Gefahrenstelle konnte nicht angelegt werden' }, { status: 500 });
  }
}
