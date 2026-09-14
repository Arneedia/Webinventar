import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

// Liste aller Kategorien
export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const categories = await prisma.bueroKategorie.findMany({
      include: {
        _count: {
          select: { Inventar: true },
        },
      },
      orderBy: { Name: 'asc' },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Database error (GET /api/office-categories):', error);
    return NextResponse.json({ error: 'Datenbankfehler', details: String(error) }, { status: 500 });
  }
}

// Neue Kategorie erstellen
export async function POST(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.DEVICES_EDIT);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { name, beschreibung } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 });
    }

    const category = await prisma.bueroKategorie.create({
      data: {
        Name: name,
        Beschreibung: beschreibung,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Database error (POST /api/office-categories):', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen', details: String(error) }, { status: 500 });
  }
}
