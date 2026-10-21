import { NextRequest, NextResponse } from 'next/server';
import { AuthConstants, invalidateSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(AuthConstants.SESSION_COOKIE_NAME)?.value ?? null;

    await invalidateSession(token);

    const redirectUrl = new URL('/', req.url);
    const res = NextResponse.redirect(redirectUrl);
    // Gleiche Logik wie beim Login: secure nur bei HTTPS (Vercel oder explizit).
    // Bei HTTP-Produktivhost würde der Browser das Lösch-Cookie sonst verwerfen.
    const isSecure = process.env.VERCEL === '1' || process.env.FORCE_SECURE_COOKIES === 'true';
    res.cookies.set(AuthConstants.SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: isSecure,
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
