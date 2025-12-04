import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { hashPassword, requireApiUser, Roles } from '@/lib/auth';
import { serializeWebUser } from '@/lib/webUsers';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const isValidRole = (value: unknown): value is (typeof Roles)[keyof typeof Roles] =>
  typeof value === 'string' && Object.values(Roles).includes(value as any);

async function ensureUserExists(userId: number) {
  const user = await prisma.webUser.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NextResponse(JSON.stringify({ error: 'Benutzer nicht gefunden' }), { status: 404 });
  }
  return user;
}

async function assertOtherAdminsRemain(userId: number) {
  const remainingAdmins = await prisma.webUser.count({
    where: {
      role: Roles.ADMIN,
      NOT: { id: userId },
    },
  });

  if (remainingAdmins === 0) {
    throw new NextResponse(JSON.stringify({ error: 'Mindestens ein Administrator muss erhalten bleiben' }), {
      status: 400,
    });
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, Roles.ADMIN);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { id } = await context.params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 });
  }

  try {
    const user = await ensureUserExists(userId);
    const body = await req.json();

    const data: Record<string, unknown> = {};

    if (typeof body.name === 'string') {
      data.name = body.name.trim() === '' ? null : body.name.trim();
    }

    if (body.password) {
      if (typeof body.password !== 'string' || body.password.length < 6) {
        return NextResponse.json({ error: 'Passwort muss mindestens 6 Zeichen haben' }, { status: 400 });
      }
      data.passwordHash = hashPassword(body.password);
      // Bei normalem Passwort-Update: mustChangePassword auf false setzen
      data.mustChangePassword = false;
    }

    // Passwort zurücksetzen (generiert temporäres Passwort, User muss es ändern)
    if (body.resetPassword === true) {
      const tempPassword = Math.random().toString(36).slice(-8);
      data.passwordHash = hashPassword(tempPassword);
      data.mustChangePassword = true;
      // Temporäres Passwort wird in der Response zurückgegeben
      const updated = await prisma.webUser.update({ where: { id: userId }, data });
      return NextResponse.json({ 
        user: serializeWebUser(updated), 
        tempPassword,
        message: 'Passwort wurde zurückgesetzt. Der Benutzer muss sich mit dem temporären Passwort anmelden und ein neues festlegen.'
      });
    }

    if (typeof body.email === 'string') {
      const trimmedEmail = body.email.trim().toLowerCase();
      if (trimmedEmail.length === 0) {
        return NextResponse.json({ error: 'E-Mail darf nicht leer sein' }, { status: 400 });
      }
      // Prüfen ob E-Mail bereits vergeben
      const existing = await prisma.webUser.findFirst({ 
        where: { email: trimmedEmail, NOT: { id: userId } } 
      });
      if (existing) {
        return NextResponse.json({ error: 'Diese E-Mail wird bereits verwendet' }, { status: 400 });
      }
      data.email = trimmedEmail;
    }

    if (body.role !== undefined) {
      if (!isValidRole(body.role)) {
        return NextResponse.json({ error: 'Ungültige Rolle' }, { status: 400 });
      }
      if (user.role === Roles.ADMIN && body.role !== Roles.ADMIN) {
        await assertOtherAdminsRemain(userId);
      }
      data.role = body.role;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Keine Felder zum Aktualisieren' }, { status: 400 });
    }

    const updated = await prisma.webUser.update({ where: { id: userId }, data });
    return NextResponse.json({ user: serializeWebUser(updated) });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error('Error in PUT /api/webusers/[id]:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Benutzer konnte nicht aktualisiert werden', details: errorMessage }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, Roles.ADMIN);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { id } = await context.params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 });
  }

  if (userId === auth.user.id) {
    return NextResponse.json({ error: 'Eigener Account kann nicht gelöscht werden' }, { status: 400 });
  }

  try {
    const user = await ensureUserExists(userId);
    if (user.role === Roles.ADMIN) {
      await assertOtherAdminsRemain(userId);
    }

    await prisma.webUser.delete({ where: { id: userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error('Error in DELETE /api/webusers/[id]:', error);
    return NextResponse.json({ error: 'Benutzer konnte nicht gelöscht werden' }, { status: 500 });
  }
}
