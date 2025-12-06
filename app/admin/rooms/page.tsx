import { redirect } from 'next/navigation';
import { getCurrentUser, Roles } from '@/lib/auth';
import RoomsManager from './RoomsManager';

export const dynamic = 'force-dynamic';

export default async function RoomsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login?redirectTo=/admin/rooms');
  }

  if (currentUser.role !== Roles.ADMIN) {
    redirect('/');
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <RoomsManager />
    </main>
  );
}
