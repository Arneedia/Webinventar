import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { prisma } from './prismaClient';
import { parsePermissions, expandPermissions, type Permission } from './permissionGroups';

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

// Typ für User mit Berechtigungen
export type UserWithPermissions = {
  id: number;
  email: string;
  name: string | null;
  role: string;
  permissions: string[];
};

async function loadUserWithPermissions(userId: number): Promise<UserWithPermissions | null> {
  try {
    console.log('[Auth] loadUserWithPermissions für userId:', userId);
    
    const user = await prisma.webUser.findUnique({
      where: { id: userId },
      include: {
        permissionGroups: {
          include: { permissionGroup: true },
        },
      },
    });

    if (!user) {
      console.log('[Auth] Kein User gefunden für userId:', userId);
      return null;
    }

    console.log('[Auth] User gefunden:', user.email, 'Rolle:', user.role);

    // Sammle alle Berechtigungen aus allen Gruppen
    const allPermissions = new Set<string>();
    for (const { permissionGroup } of user.permissionGroups) {
      const perms = parsePermissions(permissionGroup.permissions);
      for (const perm of perms) {
        allPermissions.add(perm);
      }
    }

    // Erweitere Berechtigungen um implizierte (z.B. "bearbeiten" → "erstellen", "löschen", "anzeigen")
    const expandedPermissions = expandPermissions(Array.from(allPermissions));

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: expandedPermissions,
    };
  } catch (error) {
    console.error('[Auth] Fehler beim Laden des Users:', error);
    return null;
  }
}

export async function getCurrentUserFromRequest(req: NextRequest): Promise<UserWithPermissions | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  console.log('[Auth] getCurrentUserFromRequest - Token vorhanden:', !!token);
  
  if (!token) return null;

  try {
    // Prüfe erst ob überhaupt Sessions existieren
    const totalSessions = await prisma.session.count();
    const validSessions = await prisma.session.count({
      where: { expiresAt: { gt: new Date() } }
    });
    
    console.log('[Auth] Sessions in DB - Total:', totalSessions, 'Gültig:', validSessions);
    
    const session = await prisma.session.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
      select: { userId: true, expiresAt: true },
    });

    if (!session) {
      // Prüfe ob Token existiert aber abgelaufen ist
      const expiredSession = await prisma.session.findFirst({
        where: { token },
        select: { expiresAt: true }
      });
      
      if (expiredSession) {
        console.log('[Auth] Session abgelaufen! Expires:', expiredSession.expiresAt, 'Jetzt:', new Date());
      } else {
        console.log('[Auth] Token nicht in DB gefunden (erste 10 Zeichen):', token.substring(0, 10));
      }
      return null;
    }
    
    console.log('[Auth] Session gefunden! UserId:', session.userId, 'Expires:', session.expiresAt);
    
    const user = await loadUserWithPermissions(session.userId);
    console.log('[Auth] User geladen:', !!user, user?.email);
    return user;
  } catch (error) {
    console.error('[Auth] Fehler beim Laden der Session:', error);
    return null;
  }
}

export async function getCurrentUser(): Promise<UserWithPermissions | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findFirst({
    where: {
      token,
      expiresAt: { gt: new Date() },
    },
    select: { userId: true },
  });

  if (!session) return null;
  return loadUserWithPermissions(session.userId);
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
  | { authorized: true; user: UserWithPermissions }
  | { authorized: false; status: number; message: string };

/**
 * Prüft ob der Benutzer angemeldet ist und optional eine bestimmte Rolle oder Berechtigung hat.
 * Admins haben immer alle Berechtigungen.
 */
export async function requireApiUser(
  req: NextRequest,
  roleOrPermission?: WebUserRole | Permission
): Promise<RequireApiUserResult> {
  const user = await getCurrentUserFromRequest(req);
  if (!user) {
    return { authorized: false, status: 401, message: 'Nicht angemeldet' };
  }

  // Admins haben immer alle Berechtigungen
  if (user.role === Roles.ADMIN) {
    return { authorized: true, user };
  }

  // Wenn keine Rolle/Berechtigung erforderlich, nur Login prüfen
  if (!roleOrPermission) {
    return { authorized: true, user };
  }

  // Prüfe ob es eine Rolle ist (ADMIN oder USER)
  if (roleOrPermission === Roles.ADMIN || roleOrPermission === Roles.USER) {
    if (!userHasRole(user, roleOrPermission)) {
      return { authorized: false, status: 403, message: 'Keine Berechtigung für diese Aktion' };
    }
    return { authorized: true, user };
  }

  // Ansonsten ist es eine Permission - prüfe ob der User sie hat
  if (!userHasPermission(user, roleOrPermission)) {
    return { authorized: false, status: 403, message: 'Keine Berechtigung für diese Aktion' };
  }

  return { authorized: true, user };
}

/**
 * Prüft ob ein Benutzer eine bestimmte Berechtigung hat.
 * Admins haben immer alle Berechtigungen.
 */
export function userHasPermission(user: UserWithPermissions, permission: Permission): boolean {
  if (user.role === Roles.ADMIN) return true;
  return user.permissions.includes(permission);
}

/**
 * Prüft ob ein Benutzer mindestens eine der angegebenen Berechtigungen hat.
 */
export function userHasAnyPermission(user: UserWithPermissions, permissions: Permission[]): boolean {
  if (user.role === Roles.ADMIN) return true;
  return permissions.some((perm) => user.permissions.includes(perm));
}
