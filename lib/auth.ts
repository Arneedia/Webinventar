import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { prisma } from './prismaClient';

const SESSION_COOKIE_NAME = 'session';
const SESSION_TTL_DAYS = 7;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const computed = scryptSync(password, salt, 64).toString('hex');
  return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computed, 'hex'));
}

export async function createInitialAdmin(email: string, password: string) {
  const count = await prisma.webUser.count();
  if (count > 0) return null;

  const passwordHash = hashPassword(password);
  const user = await prisma.webUser.create({
    data: {
      email,
      passwordHash,
      role: 'ADMIN',
    },
  });
  return user;
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.webUser.findUnique({ where: { email } });
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return user;
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function invalidateSession(token: string | undefined | null) {
  if (!token) return;
  await prisma.session.deleteMany({ where: { token } });
}

export async function getCurrentUserFromRequest(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  return session?.user ?? null;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  return session?.user ?? null;
}

export const AuthConstants = {
  SESSION_COOKIE_NAME,
};

export const Roles = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const;

export type WebUserRole = (typeof Roles)[keyof typeof Roles];

export function userHasRole(user: { role: string }, requiredRole?: WebUserRole) {
  if (!requiredRole) return true;
  if (user.role === Roles.ADMIN) return true;
  return user.role === requiredRole;
}

export type RequireApiUserResult =
  | { authorized: true; user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> }
  | { authorized: false; status: number; message: string };

export async function requireApiUser(req: NextRequest, role?: WebUserRole): Promise<RequireApiUserResult> {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    return { authorized: false, status: 401, message: 'Nicht angemeldet' };
  }
  if (!userHasRole(user, role)) {
    return { authorized: false, status: 403, message: 'Keine Berechtigung' };
  }
  return { authorized: true, user };
}
