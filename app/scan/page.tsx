'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, RefreshCw, X } from 'lucide-react';

function parseInventarCode(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const pathParts = url.pathname.split('/').filter(Boolean);
      const geraeteIndex = pathParts.indexOf('geraete');
      if (geraeteIndex >= 0 && pathParts.length > geraeteIndex + 1) {
        const code = decodeURIComponent(pathParts[geraeteIndex + 1] ?? '').trim();
        return code || null;
      }

      const queryCode =
        url.searchParams.get('code') ||
        url.searchParams.get('inventarCode') ||
        url.searchParams.get('inventar') ||
        url.searchParams.get('geraet');
      return queryCode?.trim() || null;
    } catch {
      return null;
    }
  }

  return trimmed;
}

export default function ScanPage() {
  const router = useRouter();
  const regionId = useId();
  const scanRegionId = useMemo(() => `qr-reader-${regionId.replace(/[^a-zA-Z0-9_-]/g, '')}`, [regionId]);

  const html5Ref = useRef<any | null>(null);
  const isStartingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const isRunningRef = useRef(false);
  const mountedRef = useRef(true);
  const hasNavigatedRef = useRef(false);
  const lastDecodedRef = useRef<string | null>(null);

  const [manualCode, setManualCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'starting' | 'running' | 'stopping'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const secureContextOk =
    typeof window !== 'undefined' &&
    (window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const stopScan = async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    try {
      if (html5Ref.current && isRunningRef.current) {
        if (mountedRef.current) setStatus('stopping');
        await html5Ref.current.stop().catch(() => undefined);
        await html5Ref.current.clear().catch(() => undefined);
      }
    } finally {
      isRunningRef.current = false;
      isStartingRef.current = false;
      isStoppingRef.current = false;
      if (mountedRef.current) setStatus('idle');
    }
  };

  useEffect(() => {
    return () => {
      void stopScan();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResult = async (text: string) => {
    if (hasNavigatedRef.current) return;
    if (text && lastDecodedRef.current === text) return;
    lastDecodedRef.current = text;

    const code = parseInventarCode(text);
    setLastResult(text);
    if (!code) {
      setError('QR-Code erkannt, aber kein Inventarcode gefunden.');
      return;
    }

    hasNavigatedRef.current = true;
    const target = `/geraete/${encodeURIComponent(code)}`;

    // Navigate immediately (mobile browsers can be flaky if we await camera stop/cleanup first).
    router.push(target);

    // Stop camera in background.
    void stopScan();

    // Fallback: if Next navigation doesn't happen, force-load the target route.
    window.setTimeout(() => {
      if (typeof window === 'undefined') return;
      if (window.location.pathname.startsWith('/scan')) {
        window.location.assign(target);
      }
    }, 700);
  };

  const startScan = async () => {
    if (!secureContextOk) {
      setError('Kamera funktioniert nur über HTTPS (oder localhost).');
      return;
    }
    if (isStartingRef.current || isRunningRef.current) return;
    setError(null);
    setLastResult(null);
    hasNavigatedRef.current = false;
    lastDecodedRef.current = null;

    isStartingRef.current = true;
    setStatus('starting');

    try {
      const mod = await import('html5-qrcode');
      const Html5Qrcode = (mod as any).Html5Qrcode;

      if (!html5Ref.current) {
        html5Ref.current = new Html5Qrcode(scanRegionId);
      }

      const cameras = await Html5Qrcode.getCameras().catch(() => []);
      const preferred = Array.isArray(cameras)
        ? cameras.find((c: any) => /back|rear|environment/i.test(c.label || ''))
        : null;

      const cameraId = preferred?.id || (Array.isArray(cameras) && cameras.length ? cameras[cameras.length - 1].id : null);

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        disableFlip: true,
      };

      const cameraConfig = cameraId
        ? cameraId
        : ({
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          } as any);

      await html5Ref.current.start(
        cameraConfig,
        config,
        async (decodedText: string) => {
          if (isStoppingRef.current) return;
          await handleResult(decodedText);
        },
        () => undefined
      );

      // Try to improve autofocus on supported browsers/devices.
      // This is best-effort only - not all browsers expose focus controls.
      if (typeof html5Ref.current?.applyVideoConstraints === 'function') {
        await html5Ref.current
          .applyVideoConstraints({ advanced: [{ focusMode: 'continuous' }] } as any)
          .catch(() => undefined);
      }

      isRunningRef.current = true;
      if (mountedRef.current) setStatus('running');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kamera konnte nicht gestartet werden.';
      setError(msg);
      await stopScan();
    } finally {
      isStartingRef.current = false;
      if (mountedRef.current && isRunningRef.current) {
        setStatus('running');
      } else if (mountedRef.current) {
        setStatus('idle');
      }
    }
  };

  const submitManual = () => {
    const code = parseInventarCode(manualCode);
    if (!code) {
      setError('Bitte einen Inventarcode eingeben.');
      return;
    }
    router.push(`/geraete/${encodeURIComponent(code)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push('/geraete')}
            className="inline-flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg px-3 py-2"
          >
            <ArrowLeft className="w-4 h-4" /> Geräte
          </button>
          <div className="text-sm font-semibold text-gray-900">Scannen</div>
          <div className="w-[88px]" />
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-4">
          {!secureContextOk && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
              Kamera-Scan funktioniert auf iOS/Android nur über **HTTPS** (oder localhost). Bitte die Seite über HTTPS öffnen.
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">{error}</div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-gray-900">Kamera</div>
                <div className="flex items-center gap-2">
                  {status === 'running' ? (
                    <button
                      type="button"
                      onClick={stopScan}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <X className="w-4 h-4" /> Stop
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startScan}
                      disabled={!secureContextOk || status === 'starting' || status === 'stopping'}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
                    >
                      {status === 'starting' ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Startet…
                        </>
                      ) : (
                        <>
                          <Camera className="w-4 h-4" /> Scan starten
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-gray-100 bg-gray-50 overflow-hidden">
                <div id={scanRegionId} className="w-full" />
              </div>

              {lastResult && (
                <div className="text-xs text-gray-500 break-all">
                  Letzter Scan: <span className="font-medium text-gray-700">{lastResult}</span>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
              <div className="text-sm font-semibold text-gray-900">Manuell</div>
              <div className="text-sm text-gray-600">
                Falls die Kamera auf iOS/Android blockiert ist (Berechtigung/HTTPS), kannst du den Inventarcode auch manuell eingeben.
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Inventarcode oder URL…"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={submitManual}
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
                >
                  Öffnen
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
