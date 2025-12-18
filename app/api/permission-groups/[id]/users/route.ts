import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Benutzer zu einer Rechtegruppe hinzufügen
export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.ADMIN_PERMISSION_GROUPS_MANAGE);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { id } = await context.params;
  const groupId = Number(id);
  if (!Number.isFinite(groupId)) {
    return NextResponse.json({ error: 'Ungültige Gruppen-ID' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId || !Number.isFinite(Number(userId))) {
      return NextResponse.json({ error: 'Ungültige Benutzer-ID' }, { status: 400 });
    }

    // Prüfen ob Gruppe existiert
    const group = await prisma.permissionGroup.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      return NextResponse.json(
        { error: 'Rechtegruppe nicht gefunden' },
        { status: 404 }
      );
    }

    // Prüfen ob Benutzer existiert
    const user = await prisma.webUser.findUnique({
      where: { id: Number(userId) },
    });
    if (!user) {
      return NextResponse.json(
        { error: 'Benutzer nicht gefunden' },
        { status: 404 }
      );
    }

    // Prüfen ob Zuordnung bereits existiert
    const existing = await prisma.webUserPermissionGroup.findUnique({
      where: {
        userId_permissionGroupId: {
          userId: Number(userId),
          permissionGroupId: groupId,
        },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Benutzer ist bereits in dieser Rechtegruppe' },
        { status: 409 }
      );
    }

    await prisma.webUserPermissionGroup.create({
      data: {
        userId: Number(userId),
        permissionGroupId: groupId,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/permission-groups/[id]/users:', error);
    return NextResponse.json(
      { error: 'Benutzer konnte nicht zur Gruppe hinzugefügt werden' },
      { status: 500 }
    );
  }
}

// Benutzer aus einer Rechtegruppe entfernen
export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.ADMIN_PERMISSION_GROUPS_MANAGE);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { id } = await context.params;
  const groupId = Number(id);
  if (!Number.isFinite(groupId)) {
    return NextResponse.json({ error: 'Ungültige Gruppen-ID' }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId || !Number.isFinite(Number(userId))) {
      return NextResponse.json({ error: 'Ungültige Benutzer-ID' }, { status: 400 });
    }

    const deleted = await prisma.webUserPermissionGroup.deleteMany({
      where: {
        userId: Number(userId),
        permissionGroupId: groupId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: 'Zuordnung nicht gefunden' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/permission-groups/[id]/users:', error);
    return NextResponse.json(
      { error: 'Benutzer konnte nicht aus der Gruppe entfernt werden' },
      { status: 500 }
    );
  }
}
