'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScanLine } from 'lucide-react';
import QRScanner from './QRScanner';

interface ScanButtonProps {
  className?: string;
  variant?: 'icon' | 'button' | 'mobile';
}

export default function ScanButton({ className = '', variant = 'button' }: ScanButtonProps) {
  const [showScanner, setShowScanner] = useState(false);
  const router = useRouter();

  const handleScan = (result: string) => {
    setShowScanner(false);
    
    // Parse the scanned URL/code
    try {
      // Check if it's a full URL
      if (result.startsWith('http://') || result.startsWith('https://')) {
        const url = new URL(result);
        const pathname = url.pathname;
        
        // Extract device code from URL like /geraete/INV-001
        if (pathname.startsWith('/geraete/')) {
          const code = pathname.replace('/geraete/', '');
          router.push(`/geraete/${encodeURIComponent(code)}`);
          return;
        }
        
        // If it's our domain, navigate to the path
        if (url.hostname === window.location.hostname || url.hostname === 'localhost') {
          router.push(pathname);
          return;
        }
      }
      
      // Check if it looks like an inventory code (e.g., INV-001, IT-2024-001)
      if (/^[A-Z]{2,4}-\d{3,}(-\d+)?$/i.test(result)) {
        router.push(`/geraete/${encodeURIComponent(result)}`);
        return;
      }
      
      // Try to navigate to the result as a path
      router.push(`/geraete/${encodeURIComponent(result)}`);
    } catch {
      // If parsing fails, try to use it as a device code
      router.push(`/geraete/${encodeURIComponent(result)}`);
    }
  };

  if (variant === 'icon') {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          className={`p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 ${className}`}
          aria-label="QR-Code scannen"
          title="QR-Code scannen"
        >
          <ScanLine className="w-5 h-5 text-gray-700" />
        </button>
        
        {showScanner && (
          <QRScanner
            onScan={handleScan}
            onClose={() => setShowScanner(false)}
            title="Inventar-Sticker scannen"
            description="Scanne einen Inventar-Sticker, um direkt zur Gerätedetailseite zu gelangen."
          />
        )}
      </>
    );
  }

  if (variant === 'mobile') {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          className={`flex items-center gap-3 px-4 py-4 rounded-xl text-base font-medium text-gray-800 hover:bg-gray-100 active:bg-gray-200 ${className}`}
        >
          <ScanLine className="w-5 h-5 text-primary-dark" />
          QR-Code scannen
        </button>
        
        {showScanner && (
          <QRScanner
            onScan={handleScan}
            onClose={() => setShowScanner(false)}
            title="Inventar-Sticker scannen"
            description="Scanne einen Inventar-Sticker, um direkt zur Gerätedetailseite zu gelangen."
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowScanner(true)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-primary-dark border border-primary/30 hover:bg-primary/10 text-xs sm:text-sm ${className}`}
      >
        <ScanLine className="w-4 h-4" />
        <span className="hidden sm:inline">Scannen</span>
      </button>
      
      {showScanner && (
        <QRScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
          title="Inventar-Sticker scannen"
          description="Scanne einen Inventar-Sticker, um direkt zur Gerätedetailseite zu gelangen."
        />
      )}
    </>
  );
}
