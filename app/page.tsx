import { getCurrentUser, Roles, userHasPermission, userHasAnyPermission } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';
import DashboardClient from './components/DashboardClient';

type IconName = 'MonitorSmartphone' | 'Boxes' | 'QrCode' | 'ClipboardList' | 'ArrowUpRight' | 'ArrowDownLeft' | 'Plus';

interface Feature {
  href: string;
  label: string;
  description: string;
  icon: IconName;
  show: boolean;
}

interface QuickAction {
  href: string;
  label: string;
  icon: IconName;
  primary: boolean;
  show: boolean;
}

export default async function Home() {
  const user = await getCurrentUser();

  // Define which features are visible based on permissions
  const features: Feature[] = [
    {
      href: '/geraete',
      label: 'Geräteverwaltung',
      description: 'Geräte suchen, Details öffnen, zuordnen',
      icon: 'MonitorSmartphone',
      show: !user || user.role === Roles.ADMIN || userHasPermission(user, AvailablePermissions.DEVICES_VIEW),
    },
    {
      href: '/admin/accessories',
      label: 'Zubehörverwaltung',
      description: 'Zubehör pflegen und verwalten',
      icon: 'Boxes',
      show: !!user && (user.role === Roles.ADMIN || userHasAnyPermission(user, [
        AvailablePermissions.ACCESSORIES_VIEW,
        AvailablePermissions.ACCESSORIES_CREATE,
        AvailablePermissions.ACCESSORIES_EDIT,
      ])),
    },
    {
      href: '/scan',
      label: 'Scannen',
      description: 'QR-Codes scannen und schnell öffnen',
      icon: 'QrCode',
      show: true,
    },
    {
      href: '/protokolle',
      label: 'Protokolle',
      description: 'Übergaben, Rückgaben und Tausche',
      icon: 'ClipboardList',
      show: !!user && (user.role === Roles.ADMIN || userHasAnyPermission(user, [
        AvailablePermissions.PROTOCOLS_VIEW,
        AvailablePermissions.PROTOCOLS_CREATE,
      ])),
    },
    {
      href: '/onboarding',
      label: 'Onboarding',
      description: 'Geräteausgabe & Start-Checkliste',
      icon: 'ArrowUpRight',
      show: !!user && (user.role === Roles.ADMIN || userHasAnyPermission(user, [
        AvailablePermissions.PROTOCOLS_VIEW,
        AvailablePermissions.PROTOCOLS_CREATE,
      ])),
    },
    {
      href: '/offboarding',
      label: 'Offboarding',
      description: 'Rückgabe & Abschluss-Checkliste',
      icon: 'ArrowDownLeft',
      show: !!user && (user.role === Roles.ADMIN || userHasAnyPermission(user, [
        AvailablePermissions.PROTOCOLS_VIEW,
        AvailablePermissions.PROTOCOLS_CREATE,
      ])),
    },
  ];

  const quickActions: QuickAction[] = [
    {
      href: '/protokolle/neu',
      label: 'Neues Protokoll',
      icon: 'Plus',
      primary: true,
      show: !!user && (user.role === Roles.ADMIN || userHasAnyPermission(user, [
        AvailablePermissions.PROTOCOLS_CREATE,
      ])),
    },
    {
      href: '/onboarding/neu',
      label: 'Neues Onboarding',
      icon: 'ArrowUpRight',
      primary: false,
      show: !!user && (user.role === Roles.ADMIN || userHasAnyPermission(user, [
        AvailablePermissions.PROTOCOLS_CREATE,
      ])),
    },
    {
      href: '/offboarding/neu',
      label: 'Neues Offboarding',
      icon: 'ArrowDownLeft',
      primary: false,
      show: !!user && (user.role === Roles.ADMIN || userHasAnyPermission(user, [
        AvailablePermissions.PROTOCOLS_CREATE,
      ])),
    },
  ];

  const visibleFeatures = features.filter(f => f.show);
  const visibleQuickActions = quickActions.filter(a => a.show);

  return (
    <DashboardClient 
      features={visibleFeatures}
      quickActions={visibleQuickActions}
    />
  );
}
