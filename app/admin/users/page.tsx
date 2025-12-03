import { redirect } from 'next/navigation';
import AdminUsersClient from './AdminUsersClient';
import { getCurrentUser, Roles } from '@/lib/auth';
import { prisma } from '@/lib/prismaClient';
import { serializeWebUsers } from '@/lib/webUsers';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect('/login?redirectTo=/admin/users');
  }

  if (currentUser.role !== Roles.ADMIN) {
    redirect('/');
  }

  const users = await prisma.webUser.findMany({ orderBy: { createdAt: 'desc' } });
  const serializableUsers = serializeWebUsers(users);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-wide text-blue-600">Administration</p>
        <h1 className="text-3xl font-bold text-gray-900">Benutzerverwaltung</h1>
        <p className="mt-2 text-gray-600">
          Nur Administratoren können Benutzer verwalten und neue Accounts erstellen.
        </p>
      </div>

      <AdminUsersClient initialUsers={serializableUsers} />
    </main>
  );
}
