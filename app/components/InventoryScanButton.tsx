'use client';

import { useInventoryMode } from '@/app/contexts/InventoryModeContext';
import { CheckCircle2, QrCode } from 'lucide-react';
import { useState } from 'react';

interface InventoryScanButtonProps {
  inventarCode: string;
  deviceName?: string;
}

export default function InventoryScanButton({ inventarCode, deviceName }: InventoryScanButtonProps) {
  const { isActive, isDeviceScanned, scanDevice, unscanDevice } = useInventoryMode();
  const [showFeedback, setShowFeedback] = useState(false);
  
  if (!isActive) {
    return null;
  }

  const isScanned = isDeviceScanned(inventarCode);

  const handleScan = () => {
    if (isScanned) {
      unscanDevice(inventarCode);
    } else {
      scanDevice(inventarCode);
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 2000);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleScan}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm shadow-sm transition-all ${
          isScanned
            ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
            : 'bg-primary text-white hover:bg-primary-dark active:scale-95'
        }`}
      >
        {isScanned ? (
          <>
            <CheckCircle2 className="w-4 h-4" />
            Gescannt
          </>
        ) : (
          <>
            <QrCode className="w-4 h-4" />
            Jetzt scannen
          </>
        )}
      </button>

      {showFeedback && (
        <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-emerald-600 text-white text-xs font-medium rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2">
          ✓ {deviceName || inventarCode} gescannt!
        </div>
      )}
    </div>
  );
}
