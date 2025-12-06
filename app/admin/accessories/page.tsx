import { redirect } from 'next/navigation';
import { getCurrentUser, Roles } from '@/lib/auth';
import AccessoriesManager from './AccessoriesManager';

export const dynamic = 'force-dynamic';

export default async function AccessoriesPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login?redirectTo=/admin/accessories');
  }

  if (currentUser.role !== Roles.ADMIN) {
    redirect('/');
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-wide text-primary-dark">Administration</p>
        <h1 className="text-3xl font-bold text-gray-900">Zubehör verwalten</h1>
        <p className="mt-2 text-gray-600">
          Stammdaten, Inventar und Zuordnungen für Zubehör zentral pflegen.
        </p>
      </div>

      <AccessoriesManager />
    </main>
  );
}
