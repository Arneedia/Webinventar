'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Camera, StopCircle, Image as ImageIcon, RefreshCcw, QrCode, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

type ScanStatus = 'idle' | 'starting' | 'scanning' | 'stopped' | 'error';

type DeviceInfo = {
  GerID: number;
  InventarCode: string;
  SNO: string;
  HW?: { HWName?: string | null };
  HS?: { HSName?: string | null };
  MOD?: { ModName?: string | null };
}; 
 
export default function ScanPage() {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [loadingDevice, setLoadingDevice] = useState(false);
  const [supportsCamera, setSupportsCamera] = useState<boolean>(false);
  // useId stellt sicher, dass die ID zwischen SSR und Client stabil bleibt
  const previewIdBase = useId();
  const previewId = useRef(`qr-preview-${previewIdBase}`);
  const html5qrcodeRef = useRef<any>(null);
  const isMountedRef = useRef(true);
  const startingRef = useRef(false);

  // Lazy load html5-qrcode only on client
  const loadScannerLib = async () => {
    // Prefers torch support and mobile-friendly constraints
    const mod = await import('html5-qrcode');
    return mod;
  };

  useEffect(() => {
    setSupportsCamera(typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia);
    return () => {
      isMountedRef.current = false;
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDevice = async (code: string) => {
    setLoadingDevice(true);
    setDevice(null);
    try {
      const res = await fetch(`/api/devices/by-code/${encodeURIComponent(code)}`);
      if (!res.ok) {
        throw new Error('Gerät nicht gefunden');
      }
      const data = await res.json();
      setDevice(data.device);
    } catch (err) {
      setDevice(null);
      setMessage(err instanceof Error ? err.message : 'Gerät nicht gefunden');
    } finally {
      setLoadingDevice(false);
    }
  };

  const handleCodeFound = async (decodedText: string) => {
    if (decodedText === lastCode) return;
    setLastCode(decodedText);
    setMessage(null);
    await fetchDevice(decodedText);
  };

  const startScanner = async () => {
    if (!supportsCamera || startingRef.current) {
      setMessage('Kamera-Zugriff nicht verfügbar (HTTPS erforderlich).');
      return;
    }
    const previewEl = typeof document !== 'undefined' ? document.getElementById(previewId.current) : null;
    if (!previewEl) {
      setStatus('error');
      setMessage('Scanner konnte nicht initialisiert werden (Preview fehlt).');
      return;
    }
    setStatus('starting');
    startingRef.current = true;
    setMessage(null);
    setLastCode(null);
    try {
      // Falls noch ein alter Scanner läuft, vorher stoppen
      if (html5qrcodeRef.current && status === 'scanning') {
        try {
          await html5qrcodeRef.current.stop();
        } catch {
          /* ignore */
        }
        html5qrcodeRef.current = null;
      }
      const mod = await loadScannerLib();
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = mod;
      if (!html5qrcodeRef.current) {
        html5qrcodeRef.current = new Html5Qrcode(previewId.current);
      }
      const configs = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.AZTEC],
        videoConstraints: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };
      await html5qrcodeRef.current.start({ facingMode: { ideal: 'environment' } }, configs, handleCodeFound);
      setStatus('scanning');
    } catch (err) {
      if (isMountedRef.current) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Kamera konnte nicht gestartet werden');
      }
    } finally {
      startingRef.current = false;
    }
  };

  const stopScanner = async () => {
    if (!html5qrcodeRef.current) {
      setStatus('stopped');
      return;
    }
    const containerExists = typeof document !== 'undefined' ? document.getElementById(previewId.current) : null;
    // Wenn das DOM-Element bereits entfernt wurde, nicht mehr stop() aufrufen (vermeidet removeChild)
    if (!containerExists) {
      html5qrcodeRef.current = null;
      setStatus('stopped');
      return;
    }
    try {
      await html5qrcodeRef.current.stop();
      // kein clear(): vermeidet removeChild-Probleme auf Mobile
    } catch {
      /* ignore stop errors */
    } finally {
      html5qrcodeRef.current = null;
    }
    setStatus('stopped');
  };

  const handleFileScan = async (file: File | null) => {
    if (!file) return;
    setMessage(null);
    setStatus('starting');
    try {
      const { Html5Qrcode } = await loadScannerLib();
      const tmpId = `qr-file-${Math.random().toString(36).slice(2)}`;
      const instance = new Html5Qrcode(tmpId);
      const result = await instance.scanFile(file, true);
      setStatus('scanning');
      await handleCodeFound(result);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Kein Code gefunden');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Left: Scanner */}
          <div className="flex-1 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-primary text-secondary">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Gerät scannen</h1>
                  <p className="text-sm text-gray-500">QR-Code mit Kamera oder Bild-Upload</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="aspect-square rounded-xl border border-dashed border-gray-300 bg-gray-100/60 flex items-center justify-center overflow-hidden">
                    <div id={previewId.current} className="w-full h-full flex items-center justify-center">
                      {status === 'idle' && (
                        <div className="text-center text-xs text-gray-500 px-4">
                          Kamera starten, um QR-Code zu scannen
                        </div>
                      )}
                      {status === 'starting' && (
                        <div className="flex flex-col items-center gap-2 text-gray-600">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-xs">Kamera wird gestartet…</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={startScanner}
                      disabled={status === 'scanning' || status === 'starting'}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-primary text-secondary disabled:opacity-60"
                    >
                      <Camera className="w-4 h-4" />
                      Scannen starten
                    </button>
                    <button
                      type="button"
                      onClick={stopScanner}
                      disabled={status !== 'scanning'}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-800 border border-gray-200 disabled:opacity-50"
                    >
                      <StopCircle className="w-4 h-4" />
                      Stop
                    </button>
                    <label className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-white text-gray-800 border border-gray-200 cursor-pointer">
                      <ImageIcon className="w-4 h-4" />
                      Bild hochladen
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileScan(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setLastCode(null);
                        setDevice(null);
                        setMessage(null);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-white text-gray-800 border border-gray-200"
                    >
                      <RefreshCcw className="w-4 h-4" />
                      Zurücksetzen
                    </button>
                  </div>

                  {message && (
                    <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>{message}</span>
                    </div>
                  )}
                </div>

                {/* Right: Result */}
                <div className="space-y-3">
                  <div className="bg-gray-100 rounded-xl p-3 text-sm text-gray-700 border border-dashed border-gray-300">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      <span>Status</span>
                    </div>
                    <div className="font-mono text-xs text-gray-900">
                      {status === 'idle' && 'Bereit'}
                      {status === 'starting' && 'Kamera wird gestartet…'}
                      {status === 'scanning' && 'Scannen läuft'}
                      {status === 'stopped' && 'Gestoppt'}
                      {status === 'error' && 'Fehler - bitte erneut versuchen'}
                    </div>
                    {lastCode && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-500">Letzter Code</div>
                        <div className="font-mono text-xs text-gray-900 break-all">{lastCode}</div>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-semibold text-gray-900">Ergebnis</span>
                    </div>

                    {loadingDevice && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Gerät wird geladen…
                      </div>
                    )}

                    {!loadingDevice && device && (
                      <div className="space-y-2">
                        <div className="text-sm font-semibold text-gray-900">
                          {device.MOD?.ModName || 'Unbekanntes Modell'}
                        </div>
                        <div className="text-sm text-gray-700">
                          {device.HW?.HWName ?? '–'} · {device.HS?.HSName ?? '–'}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">Inventarcode: {device.InventarCode}</div>
                        <a
                          href={`/geraete/${device.InventarCode}`}
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-primary text-secondary"
                        >
                          Gerät öffnen
                        </a>
                      </div>
                    )}

                    {!loadingDevice && !device && (
                      <div className="text-sm text-gray-500">
                        Noch kein Ergebnis. Scanne einen QR-Code oder lade ein Bild hoch.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 text-sm text-gray-700 space-y-2">
              <div className="font-semibold text-gray-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Hinweise
              </div>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Für Kamerazugriff wird HTTPS benötigt (Vercel erfüllt das).</li>
                <li>Bei schwachem Licht Taschenlampe am Gerät aktivieren.</li>
                <li>Falls kein Scan möglich: Bild hochladen oder Code manuell eingeben.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
