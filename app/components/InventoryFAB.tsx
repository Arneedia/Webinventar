'use client';

import Link from 'next/link';
import { ClipboardCheck } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useInventoryMode } from '@/app/contexts/InventoryModeContext';

export default function InventoryFAB() {
  const pathname = usePathname();
  const { isActive, scannedCount, totalCount } = useInventoryMode();
  
  // Nur anzeigen wenn Inventur-Modus aktiv ist und nicht auf der Inventur-Seite selbst
  if (!isActive || pathname === '/inventur') {
    return null;
  }

  const percentage = totalCount > 0 ? Math.round((scannedCount / totalCount) * 100) : 0;

  return (
    <Link
      href="/inventur"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-1 px-5 py-4 rounded-2xl bg-primary text-white shadow-xl hover:bg-primary-dark hover:shadow-2xl transition-all duration-200 active:scale-95 md:hidden"
      aria-label="Inventur-Modus öffnen"
    >
      <div className="flex items-center gap-2">
        <ClipboardCheck className="w-5 h-5" />
        <span className="font-bold text-sm">Inventur</span>
      </div>
      <div className="text-xs font-medium opacity-90">
        {scannedCount}/{totalCount} ({percentage}%)
      </div>
    </Link>
  );
}
