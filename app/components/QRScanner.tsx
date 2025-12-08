'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Camera, SwitchCamera, Loader2, AlertCircle } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
  title?: string;
  description?: string;
}

export default function QRScanner({ onScan, onClose, title = 'QR-Code scannen', description }: QRScannerProps) {
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasScannedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await scannerRef.current.stop();
        }
      } catch {
        // Ignore stop errors
      }
      try {
        scannerRef.current.clear();
      } catch {
        // Ignore clear errors
      }
      scannerRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async (cameraId?: string) => {
    if (!containerRef.current) return;

    setIsStarting(true);
    setError(null);

    await stopScanner();

    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices.length === 0) {
        setError('Keine Kamera gefunden. Bitte stelle sicher, dass eine Kamera angeschlossen ist.');
        setIsStarting(false);
        return;
      }

      setCameras(devices.map(d => ({ id: d.id, label: d.label || `Kamera ${d.id}` })));

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      // Prefer back camera on mobile
      let selectedCameraId = cameraId;
      if (!selectedCameraId) {
        const backCamera = devices.find(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('rück')
        );
        selectedCameraId = backCamera?.id || devices[0].id;
        const idx = devices.findIndex(d => d.id === selectedCameraId);
        setCurrentCameraIndex(idx >= 0 ? idx : 0);
      }

      await scanner.start(
        selectedCameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          if (!hasScannedRef.current) {
            hasScannedRef.current = true;
            onScan(decodedText);
          }
        },
        () => {
          // QR code not found - ignore
        }
      );

      setIsStarting(false);
    } catch (err) {
      console.error('Scanner error:', err);
      if (err instanceof Error) {
        if (err.message.includes('Permission')) {
          setError('Kamerazugriff verweigert. Bitte erlaube den Zugriff auf die Kamera in deinen Browser-Einstellungen.');
        } else if (err.message.includes('NotFoundError')) {
          setError('Keine Kamera gefunden. Bitte stelle sicher, dass eine Kamera angeschlossen ist.');
        } else {
          setError(`Fehler beim Starten der Kamera: ${err.message}`);
        }
      } else {
        setError('Unbekannter Fehler beim Starten der Kamera.');
      }
      setIsStarting(false);
    }
  }, [onScan, stopScanner]);

  useEffect(() => {
    if (mounted) {
      startScanner();
    }
    return () => {
      stopScanner();
    };
  }, [mounted, startScanner, stopScanner]);

  const handleSwitchCamera = async () => {
    if (cameras.length <= 1) return;
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    await startScanner(cameras[nextIndex].id);
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  const modal = (
    <div className="fixed inset-0 z-[1000]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary-dark" />
              <span className="font-semibold text-gray-900">{title}</span>
            </div>
            <button
              onClick={handleClose}
              className="p-2 -mr-2 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {description && (
              <p className="text-sm text-gray-600 mb-4">{description}</p>
            )}

            {/* Scanner Container */}
            <div className="relative bg-black rounded-xl overflow-hidden aspect-square">
              <div
                id="qr-reader"
                ref={containerRef}
                className="w-full h-full"
              />

              {/* Loading Overlay */}
              {isStarting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90">
                  <Loader2 className="w-8 h-8 text-white animate-spin mb-3" />
                  <p className="text-sm text-white">Kamera wird gestartet...</p>
                </div>
              )}

              {/* Error Overlay */}
              {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 p-4">
                  <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
                  <p className="text-sm text-white text-center">{error}</p>
                  <button
                    onClick={() => startScanner()}
                    className="mt-4 px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-100"
                  >
                    Erneut versuchen
                  </button>
                </div>
              )}

              {/* Scan Frame Overlay */}
              {!isStarting && !error && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-64 border-2 border-white/50 rounded-lg">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Switch Button */}
            {cameras.length > 1 && !error && (
              <button
                onClick={handleSwitchCamera}
                disabled={isStarting}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                <SwitchCamera className="w-5 h-5" />
                Kamera wechseln
              </button>
            )}

            {/* Hint */}
            <p className="mt-4 text-xs text-gray-500 text-center">
              Halte den QR-Code in den Rahmen, um ihn zu scannen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(modal, document.body) : null;
}
