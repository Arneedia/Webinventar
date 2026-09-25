import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

type RouteContext = { params: Promise<{ id: string }> };

async function parseId(context: RouteContext) {
  const id = Number((await context.params).id);
  return Number.isInteger(id) ? id : null;
}

// Kategorie umbenennen / Beschreibung ändern (ohne Duplikate)
export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.MASTER_DATA_EDIT);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const id = await parseId(context);
    if (id === null) return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const beschreibung = typeof body.beschreibung === 'string' ? body.beschreibung.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Bitte einen Namen angeben' }, { status: 400 });
    }

    const duplicate = await prisma.bueroKategorie.findFirst({
      where: { Name: { equals: name, mode: 'insensitive' }, NOT: { ID: id } },
    });
    if (duplicate) {
      return NextResponse.json({ error: `Kategorie „${name}“ existiert bereits` }, { status: 409 });
    }

    const category = await prisma.bueroKategorie.update({
      where: { ID: id },
      data: { Name: name, Beschreibung: beschreibung || null },
    });
    return NextResponse.json(category);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }
    console.error('Database error (PUT /api/office-categories/[id]):', error);
    return NextResponse.json({ error: 'Kategorie konnte nicht gespeichert werden' }, { status: 500 });
  }
}

// Löschen nur, wenn kein Büroinventar-Eintrag die Kategorie verwendet (Zuordnungen werden mitgelöscht)
export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.MASTER_DATA_EDIT);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const id = await parseId(context);
    if (id === null) return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });

    const inUse = await prisma.bueroInventar.count({ where: { KategorieID: id } });
    if (inUse) {
      return NextResponse.json(
        { error: `Kategorie wird noch von ${inUse} Büroinventar-Eintrag/Einträgen verwendet` },
        { status: 409 }
      );
    }

    await prisma.bueroKategorie.delete({ where: { ID: id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }
    console.error('Database error (DELETE /api/office-categories/[id]):', error);
    return NextResponse.json({ error: 'Kategorie konnte nicht gelöscht werden' }, { status: 500 });
  }
}
