import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth';
import { prisma } from '@/lib/prismaClient';
import { AvailablePermissions } from '@/lib/permissionGroups';
import { serializeInventoryUser } from '@/lib/inventoryUsers';

export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.INVENTORY_USERS_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const users = await prisma.benutzer.findMany({
      include: { ABT: true, GS: true, STAT: true, RAUM: true },
      orderBy: [{ BenutzerName: 'asc' }, { BenutzerID: 'asc' }],
    });
    return NextResponse.json({ users: users.map(serializeInventoryUser) });
  } catch (error) {
    console.error('Error in GET /api/inventory-users:', error);
    return NextResponse.json({ error: 'Benutzer konnten nicht geladen werden' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.INVENTORY_USERS_CREATE);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { name, roomId, departmentId, statusId, branchId } = await req.json();

    const created = await prisma.benutzer.create({
      data: {
        BenutzerName: name ?? null,
        RaumID: roomId ?? null,
        ABTID: departmentId ?? null,
        StatusID: statusId ?? null,
        GSID: branchId ?? null,
      },
      include: { ABT: true, GS: true, STAT: true, RAUM: true },
    });

    return NextResponse.json({ user: serializeInventoryUser(created) }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/inventory-users:', error);
    return NextResponse.json({ error: 'Benutzer konnte nicht angelegt werden' }, { status: 500 });
  }
}
