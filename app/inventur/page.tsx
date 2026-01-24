'use client';

import { useEffect, useState, useRef } from 'react';
import { ClipboardCheck, QrCode, CheckCircle2, XCircle, AlertTriangle, Download, Upload, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';

interface Device {
  id: number;
  inventarCode: string;
  sno: string | null;
  hwName: string | null;
  hsName: string | null;
  modelName: string | null;
  currentUserName: string | null;
  raumName: string | null;
  abgang: string | null;
}

interface InventoryItem {
  inventarCode: string;
  scannedAt: string;
  status: 'found' | 'unknown';
}

export default function InventurPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [scannedItems, setScannedItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'scanned' | 'missing'>('all');
  const [showScanner, setShowScanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDevices();
    loadScannedItems();
  }, []);

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

  const loadScannedItems = () => {
    const saved = localStorage.getItem('inventoryScans');
    if (saved) {
      try {
        setScannedItems(JSON.parse(saved));
      } catch {
        setScannedItems([]);
      }
    }
  };

  const saveScannedItems = (items: InventoryItem[]) => {
    localStorage.setItem('inventoryScans', JSON.stringify(items));
    setScannedItems(items);
  };

  const handleScan = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    const exists = devices.some(d => d.inventarCode === trimmed);
    const alreadyScanned = scannedItems.some(s => s.inventarCode === trimmed);

    if (alreadyScanned) {
      alert(`${trimmed} wurde bereits gescannt`);
      return;
    }

    const newItem: InventoryItem = {
      inventarCode: trimmed,
      scannedAt: new Date().toISOString(),
      status: exists ? 'found' : 'unknown',
    };

    const updated = [...scannedItems, newItem];
    saveScannedItems(updated);
    setManualCode('');
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScan(manualCode);
  };

  const handleRemoveScan = (code: string) => {
    const updated = scannedItems.filter(s => s.inventarCode !== code);
    saveScannedItems(updated);
  };

  const handleClearAll = () => {
    if (confirm('Möchten Sie wirklich alle Scans löschen?')) {
      saveScannedItems([]);
    }
  };

  const handleExport = () => {
    const data = {
      exportDate: new Date().toISOString(),
      totalDevices: devices.length,
      scannedCount: scannedItems.filter(s => s.status === 'found').length,
      missingCount: devices.length - scannedItems.filter(s => s.status === 'found').length,
      unknownCount: scannedItems.filter(s => s.status === 'unknown').length,
      scannedItems,
      missingDevices: devices
        .filter(d => !scannedItems.some(s => s.inventarCode === d.inventarCode))
        .map(d => ({
          inventarCode: d.inventarCode,
          sno: d.sno,
          hwName: d.hwName,
          currentUserName: d.currentUserName,
          raumName: d.raumName,
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
        if (data.scannedItems && Array.isArray(data.scannedItems)) {
          saveScannedItems(data.scannedItems);
          alert('Inventurdaten erfolgreich importiert');
        }
      } catch {
        alert('Fehler beim Importieren der Datei');
      }
    };
    reader.readAsText(file);
  };

  const scannedCodes = new Set(scannedItems.map(s => s.inventarCode));
  const foundDevices = devices.filter(d => scannedCodes.has(d.inventarCode));
  const missingDevices = devices.filter(d => !scannedCodes.has(d.inventarCode));
  const unknownScans = scannedItems.filter(s => s.status === 'unknown');

  const filteredDevices = (() => {
    let list = devices;
    if (filterStatus === 'scanned') {
      list = foundDevices;
    } else if (filterStatus === 'missing') {
      list = missingDevices;
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg shadow-sm">
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-semibold text-gray-900">Inventur-Modus</h1>
              <p className="text-xs text-gray-500">Geräte scannen und Bestand abgleichen</p>
            </div>
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
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-primary-dark" />
              Scannen
            </h3>
            <form onSubmit={handleManualSubmit} className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Inventarcode eingeben oder scannen..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark text-sm font-medium"
              >
                Hinzufügen
              </button>
            </form>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/scan"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <QrCode className="w-3 h-3" />
                QR-Scanner öffnen
              </Link>
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <Download className="w-3 h-3" />
                Exportieren
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <Upload className="w-3 h-3" />
                Importieren
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
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw className="w-3 h-3" />
                Aktualisieren
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <XCircle className="w-3 h-3" />
                Alle löschen
              </button>
            </div>
          </div>

          {/* Filter & Suche */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Geräte durchsuchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium ${
                    filterStatus === 'all'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Alle ({devices.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('scanned')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium ${
                    filterStatus === 'scanned'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Gescannt ({foundDevices.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('missing')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium ${
                    filterStatus === 'missing'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Fehlend ({missingDevices.length})
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
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Aktion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredDevices.map((device) => {
                      const isScanned = scannedCodes.has(device.inventarCode);
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
          )}

          {/* Unbekannte Scans */}
          {unknownScans.length > 0 && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
              <h3 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Unbekannte Scans ({unknownScans.length})
              </h3>
              <div className="space-y-2">
                {unknownScans.map((scan) => (
                  <div
                    key={scan.inventarCode}
                    className="flex items-center justify-between p-2 bg-white rounded-lg border border-amber-200"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{scan.inventarCode}</p>
                      <p className="text-xs text-gray-500">
                        Gescannt am {new Date(scan.scannedAt).toLocaleString('de-DE')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveScan(scan.inventarCode)}
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
