'use client';

import { useInventoryMode } from '@/app/contexts/InventoryModeContext';
import { QrCode, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useState, FormEvent } from 'react';

export default function LandingPageScanModule() {
  const { isActive, scannedCount, totalCount, scanDevice, isDeviceScanned } = useInventoryMode();
  const [scanInput, setScanInput] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isActive) {
    return null;
  }

  const handleScan = (e: FormEvent) => {
    e.preventDefault();
    const code = scanInput.trim();
    
    if (!code) return;

    if (isDeviceScanned(code)) {
      setFeedback({ type: 'error', message: `${code} wurde bereits gescannt` });
    } else {
      scanDevice(code);
      setFeedback({ type: 'success', message: `${code} erfolgreich gescannt!` });
      setScanInput('');
    }

    setTimeout(() => setFeedback(null), 3000);
  };

  const percentage = totalCount > 0 ? Math.round((scannedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl shadow-xl p-6 sm:p-8 text-white">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <QrCode className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold">Inventur läuft</h2>
          </div>
          <p className="text-white/80 text-sm">
            Scanne Geräte direkt hier oder nutze den QR-Scanner
          </p>
        </div>
        
        <Link
          href="/inventur"
          className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-sm font-semibold transition-colors"
        >
          Zur Inventur
        </Link>
      </div>

      {/* Fortschrittsanzeige */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Fortschritt</span>
          <span className="text-lg font-bold">{percentage}%</span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-3 mb-2">
          <div
            className="bg-white h-3 rounded-full transition-all duration-500 shadow-lg"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-white/80">
          <span>{scannedCount} gescannt</span>
          <span>{totalCount - scannedCount} verbleibend</span>
        </div>
      </div>

      {/* Schnell-Scan Eingabe */}
      <form onSubmit={handleScan} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            placeholder="Inventarcode eingeben oder scannen..."
            className="flex-1 px-4 py-3 rounded-lg bg-white/90 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white text-base font-medium"
            autoComplete="off"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-white text-primary rounded-lg hover:bg-white/90 font-semibold shadow-lg transition-all active:scale-95"
          >
            Scannen
          </button>
        </div>

        {feedback && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg ${
              feedback.type === 'success'
                ? 'bg-emerald-500/20 border border-emerald-400/30'
                : 'bg-amber-500/20 border border-amber-400/30'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            <span className="text-sm font-medium">{feedback.message}</span>
          </div>
        )}
      </form>

      {/* Schnellzugriff-Buttons */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <Link
          href="/scan"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg text-sm font-semibold transition-colors"
        >
          <QrCode className="w-4 h-4" />
          QR-Scanner
        </Link>
        <Link
          href="/inventur"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg text-sm font-semibold transition-colors"
        >
          <TrendingUp className="w-4 h-4" />
          Details
        </Link>
      </div>
    </div>
  );
}
