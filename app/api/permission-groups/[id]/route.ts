import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser, Roles } from '@/lib/auth';
import {
  serializePermissionGroup,
  stringifyPermissions,
  AvailablePermissions,
} from '@/lib/permissionGroups';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const allPermissionValues = Object.values(AvailablePermissions);

function validatePermissions(permissions: unknown): string[] | null {
  if (!Array.isArray(permissions)) return null;
  
  const validPermissions = permissions.filter(
    (p): p is string => typeof p === 'string' && allPermissionValues.includes(p as any)
  );
  
  return validPermissions;
}

async function ensureGroupExists(groupId: number) {
  const group = await prisma.permissionGroup.findUnique({
    where: { id: groupId },
    include: { users: true },
  });
  if (!group) {
    throw new NextResponse(
      JSON.stringify({ error: 'Rechtegruppe nicht gefunden' }),
      { status: 404 }
    );
  }
  return group;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, Roles.ADMIN);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { id } = await context.params;
  const groupId = Number(id);
  if (!Number.isFinite(groupId)) {
    return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 });
  }

  try {
    const group = await ensureGroupExists(groupId);
    return NextResponse.json({ group: serializePermissionGroup(group) });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error('Error in GET /api/permission-groups/[id]:', error);
    return NextResponse.json(
      { error: 'Rechtegruppe konnte nicht geladen werden' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, Roles.ADMIN);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { id } = await context.params;
  const groupId = Number(id);
  if (!Number.isFinite(groupId)) {
    return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 });
  }

  try {
    await ensureGroupExists(groupId);
    const body = await req.json();

    const data: Record<string, unknown> = {};

    if (typeof body.name === 'string') {
      const trimmedName = body.name.trim();
      if (trimmedName.length === 0) {
        return NextResponse.json(
          { error: 'Name darf nicht leer sein' },
          { status: 400 }
        );
      }
      
      // Prüfen ob Name bereits von anderer Gruppe verwendet wird
      const existing = await prisma.permissionGroup.findFirst({
        where: { name: trimmedName, NOT: { id: groupId } },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'Eine Rechtegruppe mit diesem Namen existiert bereits' },
          { status: 409 }
        );
      }
      
      data.name = trimmedName;
    }

    if (body.description !== undefined) {
      data.description = body.description?.trim() || null;
    }

    if (body.permissions !== undefined) {
      const validPermissions = validatePermissions(body.permissions);
      if (validPermissions === null) {
        return NextResponse.json(
          { error: 'Ungültige Berechtigungen' },
          { status: 400 }
        );
      }
      data.permissions = stringifyPermissions(validPermissions);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'Keine Felder zum Aktualisieren' },
        { status: 400 }
      );
    }

    const updated = await prisma.permissionGroup.update({
      where: { id: groupId },
      data,
      include: { users: true },
    });

    return NextResponse.json({ group: serializePermissionGroup(updated) });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error('Error in PUT /api/permission-groups/[id]:', error);
    return NextResponse.json(
      { error: 'Rechtegruppe konnte nicht aktualisiert werden' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, Roles.ADMIN);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { id } = await context.params;
  const groupId = Number(id);
  if (!Number.isFinite(groupId)) {
    return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 });
  }

  try {
    await ensureGroupExists(groupId);
    await prisma.permissionGroup.delete({ where: { id: groupId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error('Error in DELETE /api/permission-groups/[id]:', error);
    return NextResponse.json(
      { error: 'Rechtegruppe konnte nicht gelöscht werden' },
      { status: 500 }
    );
  }
}
