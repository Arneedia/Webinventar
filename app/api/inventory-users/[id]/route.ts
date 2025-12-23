import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth';
import { prisma } from '@/lib/prismaClient';
import { AvailablePermissions } from '@/lib/permissionGroups';
import { serializeInventoryUser } from '@/lib/inventoryUsers';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.INVENTORY_USERS_EDIT);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { id } = await context.params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 });
  }

  try {
    const { name, room, departmentId, statusId, branchId } = await req.json();

    const updated = await prisma.benutzer.update({
      where: { BenutzerID: userId },
      data: {
        BenutzerName: name ?? null,
        BenutzerRaum: room ?? null,
        ABTID: departmentId ?? null,
        StatusID: statusId ?? null,
        GSID: branchId ?? null,
      },
      include: { ABT: true, GS: true, STAT: true },
    });

    return NextResponse.json({ user: serializeInventoryUser(updated) });
  } catch (error) {
    console.error('Error in PUT /api/inventory-users/[id]:', error);
    return NextResponse.json({ error: 'Benutzer konnte nicht aktualisiert werden' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.INVENTORY_USERS_DELETE);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { id } = await context.params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 });
  }

  try {
    await prisma.benutzer.delete({ where: { BenutzerID: userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/inventory-users/[id]:', error);
    return NextResponse.json({ error: 'Benutzer konnte nicht gelöscht werden' }, { status: 500 });
  }
}
