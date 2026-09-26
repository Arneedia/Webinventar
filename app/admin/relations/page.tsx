import { redirect } from 'next/navigation';
import { getCurrentUser, Roles, userHasAnyPermission } from '@/lib/auth';
import RelationsManager from './RelationsManager';
import { AvailablePermissions } from '@/lib/permissionGroups';

export const dynamic = 'force-dynamic';

export default async function RelationsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login?redirectTo=/admin/relations');
  }

  if (
    currentUser.role !== Roles.ADMIN &&
    !userHasAnyPermission(currentUser, [AvailablePermissions.MASTER_DATA_EDIT, AvailablePermissions.RELATIONS_EDIT, AvailablePermissions.RELATIONS_DEVICES_EDIT, AvailablePermissions.RELATIONS_OFFICE_EDIT])
  ) {
    redirect('/');
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-wide text-primary-dark">Administration</p>
        <h1 className="text-3xl font-bold text-gray-900">Zuordnungen verwalten</h1>
        <p className="mt-2 text-gray-600">
          Verwalte welche Hardwaretypen Hersteller- und Modellkombinationen unterstützen.
        </p>
      </div>

      <RelationsManager />
    </main>
  );
}
