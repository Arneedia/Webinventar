import { redirect } from 'next/navigation';
import PermissionGroupsClient from './PermissionGroupsClient';
import { getCurrentUser, Roles, userHasPermission } from '@/lib/auth';
import { prisma } from '@/lib/prismaClient';
import { serializePermissionGroups } from '@/lib/permissionGroups';
import { AvailablePermissions } from '@/lib/permissionGroups';

export const dynamic = 'force-dynamic';

export default async function PermissionGroupsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login?redirectTo=/admin/permission-groups');
  }

  if (
    currentUser.role !== Roles.ADMIN &&
    !userHasPermission(currentUser, AvailablePermissions.ADMIN_PERMISSION_GROUPS_MANAGE)
  ) {
    redirect('/');
  }

  const groups = await prisma.permissionGroup.findMany({
    include: { users: true },
    orderBy: { name: 'asc' },
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-wide text-primary-dark">Administration</p>
        <h1 className="text-3xl font-bold text-gray-900">Rechtegruppen</h1>
        <p className="mt-2 text-gray-600">
          Verwalten Sie Rechtegruppen und weisen Sie Benutzern spezifische Berechtigungen zu.
        </p>
      </div>

      <PermissionGroupsClient initialGroups={serializePermissionGroups(groups)} />
    </main>
  );
}
