import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { AuthConstants, authenticateUser, createInitialAdmin, createSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-Mail und Passwort erforderlich' }, { status: 400 });
    }

    let user = await prisma.webUser.findUnique({ where: { email } });

    if (!user) {
      // Falls noch kein User existiert, ersten User als ADMIN anlegen
      const count = await prisma.webUser.count();
      if (count === 0) {
        user = await createInitialAdmin(email, password);
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Ungültige Zugangsdaten' }, { status: 401 });
    }

    const authed = await authenticateUser(email, password);
    if (!authed) {
      return NextResponse.json({ error: 'Ungültige Zugangsdaten' }, { status: 401 });
    }

    const { token, expiresAt } = await createSession(authed.id);

    const res = NextResponse.json({
      id: authed.id,
      email: authed.email,
      name: authed.name,
      role: authed.role,
    });

    res.cookies.set(AuthConstants.SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });

    return res;
  } catch (error) {
    console.error('Error in POST /api/auth/login:', error);
    return NextResponse.json({ error: 'Login fehlgeschlagen', details: String(error) }, { status: 500 });
  }
}
