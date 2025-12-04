import Link from 'next/link';
import { Database } from 'lucide-react';
import { getCurrentUser, Roles } from '@/lib/auth';

export default async function Navbar() {
  const user = await getCurrentUser();
  const mainLinks = [
    { href: '/', label: 'Rohdaten' },
    { href: '/geraete', label: 'Geräteverwaltung' },
  ];

  const adminLinks = [
    { href: '/admin/users', label: 'Userverwaltung' },
    { href: '/admin/relations', label: 'Zuordnungen' },
    { href: '/admin/accessories', label: 'Zubehör' },
  ];
  return (
    <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg shadow-sm">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900">Inventar-Verwaltung</span>
            <span className="text-xs text-gray-500">IT-Abteilung</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-gray-50 text-xs text-gray-600">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            <span>Lokal</span>
            <span className="text-gray-400">·</span>
            <span>Prisma</span>
          </div>
          <nav className="hidden sm:flex items-center gap-2 text-xs sm:text-sm">
            {mainLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1 rounded-full text-gray-700 hover:bg-gray-100"
              >
                {link.label}
              </Link>
            ))}
            {user?.role === Roles.ADMIN &&
              adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1 rounded-full text-gray-700 hover:bg-gray-100"
                >
                  {link.label}
                </Link>
              ))}
            {user ? (
              <>
                <span className="mx-1 h-4 w-px bg-gray-200" />
                <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  {user.name || user.email}
                </span>
                <form method="POST" action="/api/auth/logout">
                  <button
                    type="submit"
                    className="px-3 py-1 rounded-full text-gray-700 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="px-3 py-1 rounded-full text-blue-600 border border-blue-200 hover:bg-blue-50"
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
