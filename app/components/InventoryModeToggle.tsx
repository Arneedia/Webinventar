'use client';

import { useInventoryMode } from '@/app/contexts/InventoryModeContext';
import { ClipboardCheck, Power } from 'lucide-react';

export default function InventoryModeToggle() {
  const { isActive, toggleMode, scannedCount, totalCount } = useInventoryMode();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${isActive ? 'bg-emerald-100' : 'bg-gray-100'}`}>
              <ClipboardCheck className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-gray-500'}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Inventur-Modus</h3>
              <p className="text-sm text-gray-500">
                {isActive ? 'Aktiv - Geräte können gescannt werden' : 'Inaktiv'}
              </p>
            </div>
          </div>
          
          {isActive && (
            <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-700 font-medium">Fortschritt</span>
                <span className="text-emerald-900 font-semibold">
                  {scannedCount} / {totalCount} Geräte
                </span>
              </div>
              <div className="mt-2 w-full bg-emerald-200 rounded-full h-2">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${totalCount > 0 ? (scannedCount / totalCount) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={toggleMode}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm shadow-sm transition-all ${
            isActive
              ? 'bg-red-600 text-white hover:bg-red-700 active:scale-95'
              : 'bg-primary text-white hover:bg-primary-dark active:scale-95'
          }`}
        >
          <Power className="w-4 h-4" />
          {isActive ? 'Deaktivieren' : 'Aktivieren'}
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-600">
          {isActive ? (
            <>
              <strong>Hinweis:</strong> Der Modus wird automatisch deaktiviert, wenn alle Geräte gescannt wurden.
            </>
          ) : (
            <>
              <strong>Hinweis:</strong> Beim Aktivieren werden alle bisherigen Scans zurückgesetzt und eine neue Inventur beginnt.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
