import { redirect } from 'next/navigation';
import { getCurrentUser, Roles, userHasPermission } from '@/lib/auth';
import GefahrenstellenManager from './GefahrenstellenManager';
import { AvailablePermissions } from '@/lib/permissionGroups';

export const dynamic = 'force-dynamic';

export default async function GefahrenstellenPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login?redirectTo=/admin/gefahrenstellen');
  }

  if (currentUser.role !== Roles.ADMIN && !userHasPermission(currentUser, AvailablePermissions.MASTER_DATA_EDIT)) {
    redirect('/');
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <GefahrenstellenManager />
    </main>
  );
}
