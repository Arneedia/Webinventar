import { NextRequest, NextResponse } from 'next/server';
import { AuthConstants, invalidateSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(AuthConstants.SESSION_COOKIE_NAME)?.value ?? null;

    await invalidateSession(token);

    const res = NextResponse.json({ success: true });
    res.cookies.set(AuthConstants.SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    });

    return res;
  } catch (error) {
    console.error('Error in POST /api/auth/logout:', error);
    return NextResponse.json({ error: 'Logout fehlgeschlagen', details: String(error) }, { status: 500 });
  }
}
