import Link from 'next/link';
import { Database, ChevronDown, QrCode, ClipboardList, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { getCurrentUser, Roles, userHasPermission, userHasAnyPermission } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';
import MobileMenu from './MobileMenu';

export default async function Navbar() {
  const user = await getCurrentUser();
  
  // Links die für alle eingeloggten Benutzer sichtbar sind (mit entsprechenden Berechtigungen)
  const mainLinks: { href: string; label: string; show: boolean }[] = [
    { 
      href: '/geraete', 
      label: 'Geräteverwaltung',
      show: !user || user.role === Roles.ADMIN || userHasPermission(user, AvailablePermissions.DEVICES_VIEW),
    },
    {
      href: '/scan',
      label: 'Scannen',
      show: true,
    },
    {
      href: '/admin/accessories',
      label: 'Zubehörverwaltung',
      show: !!user && (user.role === Roles.ADMIN || userHasAnyPermission(user, [
        AvailablePermissions.ACCESSORIES_VIEW,
        AvailablePermissions.ACCESSORIES_CREATE,
        AvailablePermissions.ACCESSORIES_EDIT,
      ])),
    },
    {
      href: '/protokolle',
      label: 'Protokolle',
      show: !!user && (user.role === Roles.ADMIN || userHasAnyPermission(user, [
        AvailablePermissions.PROTOCOLS_VIEW,
        AvailablePermissions.PROTOCOLS_CREATE,
      ])),
    },
    {
      href: '/onboarding',
      label: 'Onboarding',
      show: !!user && (user.role === Roles.ADMIN || userHasAnyPermission(user, [
        AvailablePermissions.PROTOCOLS_VIEW,
        AvailablePermissions.PROTOCOLS_CREATE,
      ])),
    },
    {
      href: '/offboarding',
      label: 'Offboarding',
      show: !!user && (user.role === Roles.ADMIN || userHasAnyPermission(user, [
        AvailablePermissions.PROTOCOLS_VIEW,
        AvailablePermissions.PROTOCOLS_CREATE,
      ])),
    },
  ];

  const adminLinks: { href: string; label: string; show: boolean }[] = [
    {
      href: '/admin/users',
      label: 'Userverwaltung',
      show: !!user && (user.role === Roles.ADMIN || userHasPermission(user, AvailablePermissions.ADMIN_USERS_MANAGE)),
    },
    {
      href: '/admin/permission-groups',
      label: 'Rechtegruppen',
      show:
        !!user &&
        (user.role === Roles.ADMIN || userHasPermission(user, AvailablePermissions.ADMIN_PERMISSION_GROUPS_MANAGE)),
    },
    {
      href: '/admin/relations',
      label: 'Zuordnungen',
      show: !!user && (user.role === Roles.ADMIN || userHasPermission(user, AvailablePermissions.MASTER_DATA_EDIT)),
    },
    {
      href: '/admin/rooms',
      label: 'Raumverwaltung',
      show: !!user && (user.role === Roles.ADMIN || userHasPermission(user, AvailablePermissions.MASTER_DATA_EDIT)),
    },
  ];

  const showAdminMenu = adminLinks.some((l) => l.show);
  const homeLink = mainLinks.find((l) => l.href === '/');
  const inventoryLinks = mainLinks.filter(
    (l) => l.href !== '/' && l.href !== '/scan' && l.href !== '/protokolle' && l.href !== '/onboarding' && l.href !== '/offboarding'
  );
  const processLinks = mainLinks.filter((l) => l.href === '/protokolle' || l.href === '/onboarding' || l.href === '/offboarding');
  const scanLink = mainLinks.find((l) => l.href === '/scan');
  
  // Benutzer-spezifische Links basierend auf Berechtigungen
  const userLinks: { href: string; label: string; show: boolean }[] = [];
  return (
    <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg shadow-sm">
            <Database className="w-5 h-5 text-secondary" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900">Inventar-Verwaltung</span>
            <span className="text-xs text-gray-500">IT-Abteilung</span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-gray-50 text-xs text-gray-600">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            <span>Lokal</span>
            <span className="text-gray-400">·</span>
            <span>Prisma</span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden sm:flex items-center gap-2 text-xs sm:text-sm">
            {homeLink?.show && (
              <Link href={homeLink.href} className="px-3 py-1 rounded-full text-gray-700 hover:bg-gray-100">
                {homeLink.label}
              </Link>
            )}

            {inventoryLinks.some((l) => l.show) && (
              <div className="relative group">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Inventar
                  <ChevronDown className="w-4 h-4" />
                </button>
                <div className="hidden group-hover:flex group-focus-within:flex flex-col absolute left-0 top-full w-56 rounded-xl border border-gray-200 bg-white shadow-lg z-30">
                  {inventoryLinks
                    .filter((l) => l.show)
                    .map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl"
                      >
                        {link.label}
                      </Link>
                    ))}
                </div>
              </div>
            )}

            {scanLink?.show && (
              <Link
                href={scanLink.href}
                className="px-3 py-1 rounded-full text-gray-700 hover:bg-gray-100"
              >
                <span className="inline-flex items-center gap-1">
                  <QrCode className="w-4 h-4" /> {scanLink.label}
                </span>
              </Link>
            )}

            {processLinks.some((l) => l.show) && (
              <div className="relative group">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Prozesse
                  <ChevronDown className="w-4 h-4" />
                </button>
                <div className="hidden group-hover:flex group-focus-within:flex flex-col absolute left-0 top-full w-56 rounded-xl border border-gray-200 bg-white shadow-lg z-30">
                  {processLinks
                    .filter((l) => l.show)
                    .map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl"
                      >
                        {link.href === '/protokolle' ? (
                          <span className="inline-flex items-center gap-2">
                            <ClipboardList className="w-4 h-4" /> {link.label}
                          </span>
                        ) : link.href === '/onboarding' ? (
                          <span className="inline-flex items-center gap-2">
                            <ArrowUpRight className="w-4 h-4" /> {link.label}
                          </span>
                        ) : link.href === '/offboarding' ? (
                          <span className="inline-flex items-center gap-2">
                            <ArrowDownLeft className="w-4 h-4" /> {link.label}
                          </span>
                        ) : (
                          link.label
                        )}
                      </Link>
                    ))}
                </div>
              </div>
            )}
            {/* Benutzer-spezifische Links basierend auf Berechtigungen */}
            {userLinks.filter(link => link.show).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1 rounded-full text-gray-700 hover:bg-gray-100"
              >
                {link.label}
              </Link>
            ))}
            {/* Admin-Links */}
            {showAdminMenu && (
              <div className="relative group">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Administration
                  <ChevronDown className="w-4 h-4" />
                </button>
                <div className="hidden group-hover:flex group-focus-within:flex flex-col absolute right-0 top-full w-56 rounded-xl border border-gray-200 bg-white shadow-lg z-30">
                  {adminLinks.filter((l) => l.show).map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
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
                className="px-3 py-1 rounded-full text-primary-dark border border-primary/30 hover:bg-primary/10"
              >
                Login
              </Link>
            )}
          </nav>

          {/* Mobile Menu */}
          <MobileMenu
            mainLinks={mainLinks}
            userLinks={userLinks}
            adminLinks={adminLinks}
            isAdmin={showAdminMenu}
            user={user ? { name: user.name, email: user.email } : null}
          />
        </div>
      </div>
    </header>
  );
}
