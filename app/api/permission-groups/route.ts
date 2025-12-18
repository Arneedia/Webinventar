import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import {
  serializePermissionGroups,
  serializePermissionGroup,
  stringifyPermissions,
  AvailablePermissions,
} from '@/lib/permissionGroups';

const allPermissionValues = Object.values(AvailablePermissions);

function validatePermissions(permissions: unknown): string[] | null {
  if (!Array.isArray(permissions)) return null;
  
  const validPermissions = permissions.filter(
    (p): p is string => typeof p === 'string' && allPermissionValues.includes(p as any)
  );
  
  return validPermissions;
}

export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.ADMIN_PERMISSION_GROUPS_MANAGE);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const groups = await prisma.permissionGroup.findMany({
      include: { users: true },
      orderBy: { name: 'asc' },
    });
    
    return NextResponse.json({ groups: serializePermissionGroups(groups) });
  } catch (error) {
    console.error('Error in GET /api/permission-groups:', error);
    return NextResponse.json(
      { error: 'Rechtegruppen konnten nicht geladen werden' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.ADMIN_PERMISSION_GROUPS_MANAGE);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { name, description, permissions } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name ist erforderlich' },
        { status: 400 }
      );
    }

    const validPermissions = validatePermissions(permissions);
    if (validPermissions === null) {
      return NextResponse.json(
        { error: 'Ungültige Berechtigungen' },
        { status: 400 }
      );
    }

    // Prüfen ob Name bereits existiert
    const existing = await prisma.permissionGroup.findUnique({
      where: { name: name.trim() },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Eine Rechtegruppe mit diesem Namen existiert bereits' },
        { status: 409 }
      );
    }

    const group = await prisma.permissionGroup.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        permissions: stringifyPermissions(validPermissions),
      },
      include: { users: true },
    });

    return NextResponse.json(
      { group: serializePermissionGroup(group) },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/permission-groups:', error);
    return NextResponse.json(
      { error: 'Rechtegruppe konnte nicht erstellt werden' },
      { status: 500 }
    );
  }
}
