'use client';

import { useState } from 'react';
import { ScanLine } from 'lucide-react';
import QRScanner from './QRScanner';

interface AccessoryScanButtonProps {
  onScanResult: (inventarCode: string) => void;
  className?: string;
}

export default function AccessoryScanButton({ onScanResult, className = '' }: AccessoryScanButtonProps) {
  const [showScanner, setShowScanner] = useState(false);

  const handleScan = (result: string) => {
    setShowScanner(false);
    
    // Parse the scanned URL/code to extract inventory code
    let inventarCode = result;
    
    try {
      if (result.startsWith('http://') || result.startsWith('https://')) {
        const url = new URL(result);
        const pathname = url.pathname;
        
        // Extract device code from URL like /geraete/INV-001
        if (pathname.startsWith('/geraete/')) {
          inventarCode = decodeURIComponent(pathname.replace('/geraete/', ''));
        }
      }
    } catch {
      // Use result as-is
    }
    
    onScanResult(inventarCode);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowScanner(true)}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-primary text-primary-dark hover:bg-primary/10 text-sm font-medium ${className}`}
      >
        <ScanLine className="w-4 h-4" />
        Scannen
      </button>
      
      {showScanner && (
        <QRScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
          title="Inventar-Code scannen"
          description="Scanne einen Inventar-Sticker, um das Gerät in der Suche zu finden."
        />
      )}
    </>
  );
}
