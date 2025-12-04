'use client';

import { AvailablePermissions, type Permission } from './permissionGroups';

export type UserWithPermissions = {
  id: number;
  email: string;
  name: string | null;
  role: string;
  permissions: string[];
};

/**
 * Prüft ob ein Benutzer eine bestimmte Berechtigung hat.
 * Admins haben immer alle Berechtigungen.
 */
export function hasPermission(
  user: UserWithPermissions | null | undefined,
  permission: Permission
): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return user.permissions.includes(permission);
}

/**
 * Prüft ob ein Benutzer mindestens eine der angegebenen Berechtigungen hat.
 */
export function hasAnyPermission(
  user: UserWithPermissions | null | undefined,
  permissions: Permission[]
): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return permissions.some((perm) => user.permissions.includes(perm));
}

/**
 * Prüft ob ein Benutzer alle angegebenen Berechtigungen hat.
 */
export function hasAllPermissions(
  user: UserWithPermissions | null | undefined,
  permissions: Permission[]
): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return permissions.every((perm) => user.permissions.includes(perm));
}

/**
 * Prüft ob der Benutzer ein Admin ist.
 */
export function isAdmin(user: UserWithPermissions | null | undefined): boolean {
  return user?.role === 'ADMIN';
}

// Re-export für einfache Verwendung
export { AvailablePermissions };
