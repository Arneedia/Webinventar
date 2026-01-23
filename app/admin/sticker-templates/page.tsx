import { redirect } from 'next/navigation';
import { getCurrentUser, userHasPermission } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';
import StickerTemplateManager from './StickerTemplateManager';

export default async function StickerTemplatesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?redirectTo=/admin/sticker-templates');
  }

  const canManageTemplates = await userHasPermission(user, AvailablePermissions.MASTER_DATA_EDIT);

  if (!canManageTemplates) {
    redirect('/');
  }

  return <StickerTemplateManager />;
}
