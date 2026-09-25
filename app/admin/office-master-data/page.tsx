import { redirect } from 'next/navigation';
import { getCurrentUser, Roles, userHasPermission } from '@/lib/auth';
import OfficeMasterDataManager from './OfficeMasterDataManager';
import { AvailablePermissions } from '@/lib/permissionGroups';

export const dynamic = 'force-dynamic';

export default async function OfficeMasterDataPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login?redirectTo=/admin/office-master-data');
  }

  if (currentUser.role !== Roles.ADMIN && !userHasPermission(currentUser, AvailablePermissions.MASTER_DATA_EDIT)) {
    redirect('/');
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10">
      <OfficeMasterDataManager />
    </main>
  );
}
