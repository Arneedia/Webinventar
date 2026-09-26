'use client';

import { useEffect, useState, useRef } from 'react';
import { ClipboardCheck, QrCode, CheckCircle2, XCircle, AlertTriangle, Download, Upload, RefreshCw, Search, Power } from 'lucide-react';
import Link from 'next/link';
import { useInventoryMode } from '@/app/contexts/InventoryModeContext';

interface Device {
  id: number;
  inventarCode: string;
  sno: string | null;
  hwName: string | null;
  hsName: string | null;
  modelName: string | null;
  currentUserName: string | null;
  raumName: string | null;
  raumBranch: string | null;
  abgang: string | null;
}

interface InventoryItem {
  inventarCode: string;
  scannedAt: string;
  status: 'found' | 'unknown';
}

export default function InventurPage() {
  const { isActive, activateMode, deactivateMode, scanDevice, unscanDevice, isDeviceScanned, getScannedDevices, scannedCount, totalCount, clearAllScans, canUseInventur, inventurPermissionChecked } = useInventoryMode();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'scanned' | 'missing'>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [showScanner, setShowScanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (canUseInventur) fetchDevices();
  }, [canUseInventur]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/devices');
      if (!res.ok) throw new Error('Fehler beim Laden der Geräte');
      const data: Device[] = await res.json();
      setDevices(data.filter(d => !d.abgang));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };


  const handleScan = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    if (!isActive) {
      alert('Bitte aktivieren Sie zuerst den Inventur-Modus');
      return;
    }

    const alreadyScanned = isDeviceScanned(trimmed);

    if (alreadyScanned) {
      alert(`${trimmed} wurde bereits gescannt`);
      return;
    }

    scanDevice(trimmed);
    setManualCode('');
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScan(manualCode);
  };

  const handleRemoveScan = (code: string) => {
    unscanDevice(code);
  };

  const handleClearAll = () => {
    if (confirm('Möchten Sie wirklich alle Scans löschen?')) {
      clearAllScans();
    }
  };

  const handleExport = () => {
    const scannedCodes = getScannedDevices();
    const foundDevices = devices.filter(d => scannedCodes.includes(d.inventarCode));
    const missingDevices = devices.filter(d => !scannedCodes.includes(d.inventarCode));
    
    const data = {
      exportDate: new Date().toISOString(),
      totalDevices: devices.length,
      scannedCount: foundDevices.length,
      missingCount: missingDevices.length,
      scannedDevices: foundDevices.map(d => ({
        inventarCode: d.inventarCode,
        sno: d.sno,
        hwName: d.hwName,
        currentUserName: d.currentUserName,
        raumName: d.raumName,
        raumBranch: d.raumBranch,
      })),
      missingDevices: missingDevices.map(d => ({
        inventarCode: d.inventarCode,
        sno: d.sno,
        hwName: d.hwName,
        currentUserName: d.currentUserName,
        raumName: d.raumName,
        raumBranch: d.raumBranch,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventur-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.scannedDevices && Array.isArray(data.scannedDevices)) {
          clearAllScans();
          data.scannedDevices.forEach((device: any) => {
            if (device.inventarCode) {
              scanDevice(device.inventarCode);
            }
          });
          alert('Inventurdaten erfolgreich importiert');
        }
      } catch {
        alert('Fehler beim Importieren der Datei');
      }
    };
    reader.readAsText(file);
  };

  const scannedCodes = getScannedDevices();
  const scannedCodesSet = new Set(scannedCodes);
  const foundDevices = devices.filter(d => scannedCodesSet.has(d.inventarCode));
  const missingDevices = devices.filter(d => !scannedCodesSet.has(d.inventarCode));
  const unknownScans = scannedCodes.filter(code => !devices.some(d => d.inventarCode === code));

  const uniqueBranches = Array.from(new Set(devices.map(d => d.raumBranch).filter(Boolean))).sort();

  const filteredDevices = (() => {
    let list = devices;
    if (filterStatus === 'scanned') {
      list = foundDevices;
    } else if (filterStatus === 'missing') {
      list = missingDevices;
    }

    if (filterBranch !== 'all') {
      list = list.filter(d => d.raumBranch === filterBranch);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(d =>
        d.inventarCode.toLowerCase().includes(term) ||
        d.sno?.toLowerCase().includes(term) ||
        d.hwName?.toLowerCase().includes(term) ||
        d.currentUserName?.toLowerCase().includes(term)
      );
    }

    return list;
  })();

  const completionPercentage = devices.length > 0
    ? Math.round((foundDevices.length / devices.length) * 100)
    : 0;

  if (!inventurPermissionChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Prüfe Berechtigung…</div>
      </div>
    );
  }

  if (!canUseInventur) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center max-w-md">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-gray-900 mb-1">Keine Berechtigung</h1>
          <p className="text-sm text-gray-500">
            Für den Inventur-Modus ist die Berechtigung „Inventur-Modus verwenden“ oder die Admin-Rolle erforderlich.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg shadow-sm ${
                isActive ? 'bg-emerald-600' : 'bg-gray-400'
              }`}>
                <ClipboardCheck className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-sm font-semibold text-gray-900">Inventur-Modus</h1>
                <p className="text-xs text-gray-500">
                  {isActive ? 'Aktiv - Geräte scannen' : 'Inaktiv - Bitte aktivieren'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={isActive ? deactivateMode : activateMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm shadow-sm transition-all ${
                isActive
                  ? 'bg-red-600 text-white hover:bg-red-700 active:scale-95'
                  : 'bg-primary text-white hover:bg-primary-dark active:scale-95'
              }`}
            >
              <Power className="w-4 h-4" />
              {isActive ? 'Deaktivieren' : 'Aktivieren'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Statistiken */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ClipboardCheck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Gesamt</p>
                  <p className="text-2xl font-bold text-gray-900">{devices.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Gescannt</p>
                  <p className="text-2xl font-bold text-gray-900">{foundDevices.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Fehlend</p>
                  <p className="text-2xl font-bold text-gray-900">{missingDevices.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Unbekannt</p>
                  <p className="text-2xl font-bold text-gray-900">{unknownScans.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Fortschrittsbalken */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-900">Fortschritt</span>
              <span className="text-sm font-semibold text-primary-dark">{completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Scanner & Aktionen */}
          <div className={`rounded-xl border p-4 ${
            isActive ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300 opacity-60'
          }`}>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-primary-dark" />
              Scannen {!isActive && '(Modus inaktiv)'}
            </h3>
            <form onSubmit={handleManualSubmit} className="flex flex-col sm:flex-row gap-2 mb-3">
              <input
                type="text"
                placeholder="Inventarcode eingeben oder scannen..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 px-4 py-3 sm:py-2 border border-gray-300 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
              <button
                type="submit"
                disabled={!isActive}
                className="px-6 py-3 sm:px-4 sm:py-2 bg-primary text-white rounded-lg hover:bg-primary-dark text-base sm:text-sm font-semibold shadow-sm active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hinzufügen
              </button>
            </form>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
              <Link
                href="/scan"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-1.5 rounded-lg border border-gray-200 text-sm sm:text-xs font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <QrCode className="w-4 h-4 sm:w-3 sm:h-3" />
                <span className="sm:inline">QR-Scanner</span>
              </Link>
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-1.5 rounded-lg border border-gray-200 text-sm sm:text-xs font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <Download className="w-4 h-4 sm:w-3 sm:h-3" />
                Export
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-1.5 rounded-lg border border-gray-200 text-sm sm:text-xs font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <Upload className="w-4 h-4 sm:w-3 sm:h-3" />
                Import
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
              <button
                type="button"
                onClick={fetchDevices}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-1.5 rounded-lg border border-gray-200 text-sm sm:text-xs font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <RefreshCw className="w-4 h-4 sm:w-3 sm:h-3" />
                Aktualisieren
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-1.5 rounded-lg border border-red-200 text-sm sm:text-xs font-medium text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
              >
                <XCircle className="w-4 h-4 sm:w-3 sm:h-3" />
                Alle löschen
              </button>
            </div>
          </div>

          {/* Filter & Suche */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Geräte durchsuchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 sm:py-2 border border-gray-300 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <select
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value)}
                  className="px-4 py-3 sm:py-2 border border-gray-300 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                >
                  <option value="all">Alle Geschäftsstellen</option>
                  {uniqueBranches.map((branch) => (
                    <option key={branch} value={branch!}>
                      {branch}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`px-4 py-2.5 sm:py-2 rounded-lg text-sm sm:text-xs font-semibold transition-colors ${
                    filterStatus === 'all'
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                  }`}
                >
                  Alle<span className="hidden xs:inline"> ({devices.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('scanned')}
                  className={`px-4 py-2.5 sm:py-2 rounded-lg text-sm sm:text-xs font-semibold transition-colors ${
                    filterStatus === 'scanned'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                  }`}
                >
                  Gescannt<span className="hidden xs:inline"> ({foundDevices.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('missing')}
                  className={`px-4 py-2.5 sm:py-2 rounded-lg text-sm sm:text-xs font-semibold transition-colors ${
                    filterStatus === 'missing'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                  }`}
                >
                  Fehlend<span className="hidden xs:inline"> ({missingDevices.length})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Geräteliste */}
          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-500">Lade Geräte...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : (
            <>
              {/* Desktop Tabelle */}
              <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Inventarcode</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Typ</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Hersteller/Modell</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Benutzer</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Raum</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Geschäftsstelle</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Aktion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredDevices.map((device) => {
                        const isScanned = scannedCodesSet.has(device.inventarCode);
                        return (
                          <tr key={device.id} className={isScanned ? 'bg-emerald-50' : ''}>
                            <td className="px-4 py-3">
                              {isScanned ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                              ) : (
                                <XCircle className="w-5 h-5 text-gray-300" />
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <Link
                                href={`/geraete/${device.inventarCode}`}
                                className="text-sm font-medium text-primary-dark hover:underline"
                              >
                                {device.inventarCode}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">{device.hwName || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {device.hsName && device.modelName
                                ? `${device.hsName} · ${device.modelName}`
                                : device.hsName || device.modelName || '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">{device.currentUserName || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{device.raumName || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{device.raumBranch || '—'}</td>
                            <td className="px-4 py-3">
                              {isScanned ? (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveScan(device.inventarCode)}
                                  className="text-xs text-red-600 hover:underline"
                                >
                                  Entfernen
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleScan(device.inventarCode)}
                                  className="text-xs text-primary-dark hover:underline"
                                >
                                  Scannen
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Karten-Ansicht */}
              <div className="md:hidden space-y-3">
                {filteredDevices.map((device) => {
                  const isScanned = scannedCodesSet.has(device.inventarCode);
                  return (
                    <div
                      key={device.id}
                      className={`rounded-xl border p-4 ${
                        isScanned
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {isScanned ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                          ) : (
                            <XCircle className="w-6 h-6 text-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/geraete/${device.inventarCode}`}
                            className="text-base font-semibold text-primary-dark hover:underline block mb-2"
                          >
                            {device.inventarCode}
                          </Link>
                          <div className="space-y-1.5 text-sm">
                            {device.hwName && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 min-w-[80px]">Typ:</span>
                                <span className="text-gray-900 font-medium">{device.hwName}</span>
                              </div>
                            )}
                            {(device.hsName || device.modelName) && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 min-w-[80px]">Modell:</span>
                                <span className="text-gray-900">
                                  {device.hsName && device.modelName
                                    ? `${device.hsName} · ${device.modelName}`
                                    : device.hsName || device.modelName}
                                </span>
                              </div>
                            )}
                            {device.currentUserName && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 min-w-[80px]">Benutzer:</span>
                                <span className="text-gray-900">{device.currentUserName}</span>
                              </div>
                            )}
                            {device.raumName && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 min-w-[80px]">Raum:</span>
                                <span className="text-gray-900">{device.raumName}</span>
                              </div>
                            )}
                            {device.raumBranch && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 min-w-[80px]">Standort:</span>
                                <span className="text-gray-900 font-medium">{device.raumBranch}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Link
                            href={`/geraete/${device.inventarCode}`}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
                          >
                            Details
                          </Link>
                          {isScanned ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveScan(device.inventarCode)}
                              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors"
                            >
                              Scan entfernen
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleScan(device.inventarCode)}
                              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
                            >
                              Scannen
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Unbekannte Scans */}
          {unknownScans.length > 0 && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <h3 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Unbekannte Scans ({unknownScans.length})
              </h3>
              <div className="space-y-2">
                {unknownScans.map((code) => (
                  <div
                    key={code}
                    className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-200"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{code}</p>
                      <p className="text-xs text-gray-500">
                        Nicht in der Datenbank gefunden
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveScan(code)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Entfernen
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
