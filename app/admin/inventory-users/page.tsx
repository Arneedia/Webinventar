import { redirect } from 'next/navigation';
import { getCurrentUser, Roles, userHasPermission } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';
import { fetchInventoryUsers, fetchInventoryLookups } from '@/lib/inventoryUsers';
import InventoryUsersClient from './InventoryUsersClient';

export const dynamic = 'force-dynamic';

export default async function InventoryUsersPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login?redirectTo=/admin/inventory-users');
  }

  const canView =
    currentUser.role === Roles.ADMIN || userHasPermission(currentUser, AvailablePermissions.INVENTORY_USERS_VIEW);

  if (!canView) {
    redirect('/');
  }

  const [users, lookups] = await Promise.all([fetchInventoryUsers(), fetchInventoryLookups()]);

  const canCreate =
    currentUser.role === Roles.ADMIN || userHasPermission(currentUser, AvailablePermissions.INVENTORY_USERS_CREATE);
  const canEdit =
    currentUser.role === Roles.ADMIN || userHasPermission(currentUser, AvailablePermissions.INVENTORY_USERS_EDIT);
  const canDelete =
    currentUser.role === Roles.ADMIN || userHasPermission(currentUser, AvailablePermissions.INVENTORY_USERS_DELETE);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-wide text-primary-dark">Administration</p>
        <h1 className="text-3xl font-bold text-gray-900">Inventar-Benutzer</h1>
        <p className="mt-2 text-gray-600">
          Mitarbeitende aus der Inventardatenbank verwalten (Anlage, Stammdaten, Zuordnungen).
        </p>
      </div>

      <InventoryUsersClient
        initialUsers={users}
        lookups={lookups}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </main>
  );
}
