import type { PermissionGroup, WebUserPermissionGroup } from './generated/prisma/client';

// Verfügbare Berechtigungen im System
export const AvailablePermissions = {
  // Geräte
  DEVICES_VIEW: 'devices:view',
  DEVICES_CREATE: 'devices:create',
  DEVICES_EDIT: 'devices:edit',
  DEVICES_DELETE: 'devices:delete',
  
  // Benutzer (Inventar-Benutzer)
  INVENTORY_USERS_VIEW: 'inventory_users:view',
  INVENTORY_USERS_CREATE: 'inventory_users:create',
  INVENTORY_USERS_EDIT: 'inventory_users:edit',
  INVENTORY_USERS_DELETE: 'inventory_users:delete',
  
  // Zubehör
  ACCESSORIES_VIEW: 'accessories:view',
  ACCESSORIES_CREATE: 'accessories:create',
  ACCESSORIES_EDIT: 'accessories:edit',
  ACCESSORIES_DELETE: 'accessories:delete',
  
  // Stammdaten
  MASTER_DATA_VIEW: 'master_data:view',
  MASTER_DATA_EDIT: 'master_data:edit',
  
  // Berichte
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',
} as const;

export type Permission = (typeof AvailablePermissions)[keyof typeof AvailablePermissions];

// Gruppierte Berechtigungen für die UI
export const PermissionCategories = [
  {
    name: 'Geräte',
    permissions: [
      { key: AvailablePermissions.DEVICES_VIEW, label: 'Geräte anzeigen' },
      { key: AvailablePermissions.DEVICES_CREATE, label: 'Geräte erstellen' },
      { key: AvailablePermissions.DEVICES_EDIT, label: 'Geräte bearbeiten' },
      { key: AvailablePermissions.DEVICES_DELETE, label: 'Geräte löschen' },
    ],
  },
  {
    name: 'Inventar-Benutzer',
    permissions: [
      { key: AvailablePermissions.INVENTORY_USERS_VIEW, label: 'Benutzer anzeigen' },
      { key: AvailablePermissions.INVENTORY_USERS_CREATE, label: 'Benutzer erstellen' },
      { key: AvailablePermissions.INVENTORY_USERS_EDIT, label: 'Benutzer bearbeiten' },
      { key: AvailablePermissions.INVENTORY_USERS_DELETE, label: 'Benutzer löschen' },
    ],
  },
  {
    name: 'Zubehör',
    permissions: [
      { key: AvailablePermissions.ACCESSORIES_VIEW, label: 'Zubehör anzeigen' },
      { key: AvailablePermissions.ACCESSORIES_CREATE, label: 'Zubehör erstellen' },
      { key: AvailablePermissions.ACCESSORIES_EDIT, label: 'Zubehör bearbeiten' },
      { key: AvailablePermissions.ACCESSORIES_DELETE, label: 'Zubehör löschen' },
    ],
  },
  {
    name: 'Stammdaten',
    permissions: [
      { key: AvailablePermissions.MASTER_DATA_VIEW, label: 'Stammdaten anzeigen' },
      { key: AvailablePermissions.MASTER_DATA_EDIT, label: 'Stammdaten bearbeiten' },
    ],
  },
  {
    name: 'Berichte',
    permissions: [
      { key: AvailablePermissions.REPORTS_VIEW, label: 'Berichte anzeigen' },
      { key: AvailablePermissions.REPORTS_EXPORT, label: 'Berichte exportieren' },
    ],
  },
] as const;

export type SerializablePermissionGroup = {
  id: number;
  name: string;
  description: string | null;
  permissions: string[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
};

export type PermissionGroupWithUsers = PermissionGroup & {
  users: WebUserPermissionGroup[];
};

export function serializePermissionGroup(
  group: PermissionGroupWithUsers
): SerializablePermissionGroup {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    permissions: parsePermissions(group.permissions),
    userCount: group.users.length,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  };
}

export function serializePermissionGroups(
  groups: PermissionGroupWithUsers[]
): SerializablePermissionGroup[] {
  return groups.map(serializePermissionGroup);
}

export function parsePermissions(permissionsJson: string): string[] {
  try {
    const parsed = JSON.parse(permissionsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Berechtigungs-Hierarchie: "bearbeiten" schließt "erstellen", "löschen" und "anzeigen" ein
const PermissionImplications: Record<string, string[]> = {
  // Geräte bearbeiten → kann auch erstellen, löschen und anzeigen
  [AvailablePermissions.DEVICES_EDIT]: [
    AvailablePermissions.DEVICES_CREATE,
    AvailablePermissions.DEVICES_DELETE,
    AvailablePermissions.DEVICES_VIEW,
  ],
  [AvailablePermissions.DEVICES_CREATE]: [AvailablePermissions.DEVICES_VIEW],
  [AvailablePermissions.DEVICES_DELETE]: [AvailablePermissions.DEVICES_VIEW],
  
  // Zubehör bearbeiten → kann auch erstellen, löschen und anzeigen
  [AvailablePermissions.ACCESSORIES_EDIT]: [
    AvailablePermissions.ACCESSORIES_CREATE,
    AvailablePermissions.ACCESSORIES_DELETE,
    AvailablePermissions.ACCESSORIES_VIEW,
  ],
  [AvailablePermissions.ACCESSORIES_CREATE]: [AvailablePermissions.ACCESSORIES_VIEW],
  [AvailablePermissions.ACCESSORIES_DELETE]: [AvailablePermissions.ACCESSORIES_VIEW],
  
  // Inventar-Benutzer bearbeiten → kann auch erstellen, löschen und anzeigen
  [AvailablePermissions.INVENTORY_USERS_EDIT]: [
    AvailablePermissions.INVENTORY_USERS_CREATE,
    AvailablePermissions.INVENTORY_USERS_DELETE,
    AvailablePermissions.INVENTORY_USERS_VIEW,
  ],
  [AvailablePermissions.INVENTORY_USERS_CREATE]: [AvailablePermissions.INVENTORY_USERS_VIEW],
  [AvailablePermissions.INVENTORY_USERS_DELETE]: [AvailablePermissions.INVENTORY_USERS_VIEW],
  
  // Stammdaten bearbeiten → kann auch anzeigen
  [AvailablePermissions.MASTER_DATA_EDIT]: [AvailablePermissions.MASTER_DATA_VIEW],
  
  // Berichte exportieren → kann auch anzeigen
  [AvailablePermissions.REPORTS_EXPORT]: [AvailablePermissions.REPORTS_VIEW],
};

// Erweitert Berechtigungen um implizierte Berechtigungen
export function expandPermissions(permissions: string[]): string[] {
  const expanded = new Set<string>(permissions);
  
  for (const perm of permissions) {
    const implied = PermissionImplications[perm];
    if (implied) {
      for (const impliedPerm of implied) {
        expanded.add(impliedPerm);
      }
    }
  }
  
  return Array.from(expanded);
}

export function stringifyPermissions(permissions: string[]): string {
  return JSON.stringify(permissions);
}

// Prüft ob ein Benutzer eine bestimmte Berechtigung hat
export function userHasPermission(
  userPermissions: string[],
  requiredPermission: Permission
): boolean {
  return userPermissions.includes(requiredPermission);
}

// Sammelt alle Berechtigungen eines Benutzers aus seinen Gruppen
export function collectUserPermissions(
  groups: { permissionGroup: { permissions: string } }[]
): string[] {
  const allPermissions = new Set<string>();
  
  for (const { permissionGroup } of groups) {
    const permissions = parsePermissions(permissionGroup.permissions);
    for (const perm of permissions) {
      allPermissions.add(perm);
    }
  }
  
  return Array.from(allPermissions);
}
