import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { hashPassword, requireApiUser, Roles } from '@/lib/auth';
import { serializeWebUser, serializeWebUsers } from '@/lib/webUsers';
import { AvailablePermissions } from '@/lib/permissionGroups';

const isValidRole = (value: unknown): value is (typeof Roles)[keyof typeof Roles] =>
  typeof value === 'string' && Object.values(Roles).includes(value as any);

export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.ADMIN_USERS_MANAGE);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const users = await prisma.webUser.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ users: serializeWebUsers(users) });
  } catch (error) {
    console.error('Error in GET /api/webusers:', error);
    return NextResponse.json({ error: 'Benutzer konnten nicht geladen werden' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.ADMIN_USERS_MANAGE);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { email, name, password, role } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-Mail und Passwort erforderlich' }, { status: 400 });
    }

    const existing = await prisma.webUser.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'E-Mail bereits vergeben' }, { status: 409 });
    }

    const user = await prisma.webUser.create({
      data: {
        email,
        name,
        passwordHash: hashPassword(password),
        role: isValidRole(role) ? role : Roles.USER,
      },
    });

    return NextResponse.json({ user: serializeWebUser(user) }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/webusers:', error);
    return NextResponse.json({ error: 'Benutzer konnte nicht angelegt werden' }, { status: 500 });
  }
}
