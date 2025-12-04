import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { getCurrentUserFromRequest, hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
    }

    const { newPassword } = await req.json();

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json({ error: 'Passwort muss mindestens 6 Zeichen haben' }, { status: 400 });
    }

    await prisma.webUser.update({
      where: { id: user.id },
      data: {
        passwordHash: hashPassword(newPassword),
        mustChangePassword: false,
      },
    });

    return NextResponse.json({ success: true, message: 'Passwort wurde geändert' });
  } catch (error) {
    console.error('Error in POST /api/auth/change-password:', error);
    return NextResponse.json({ error: 'Passwort konnte nicht geändert werden' }, { status: 500 });
  }
}
