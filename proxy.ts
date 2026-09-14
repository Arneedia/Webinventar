import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Öffentliche Routen
  const publicPrefixes = ['/login', '/api/auth/', '/_next', '/favicon'];
  if (publicPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Geschützte Seiten
  const protectedPrefixes = ['/', '/geraete', '/admin', '/auswertungen'];
  const requiresAuth = protectedPrefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));

  if (!requiresAuth) {
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get('session');

  if (!sessionCookie) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
