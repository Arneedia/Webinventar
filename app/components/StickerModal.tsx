'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Printer, Loader2, QrCode } from 'lucide-react';

interface StickerData {
  device: {
    id: number;
    inventarCode: string;
    sno: string;
    hwName: string | null;
    hsName: string | null;
    modelName: string | null;
  };
  qrCode: string;
  url: string;
}

interface StickerModalProps {
  deviceId: number;
  onClose: () => void;
}

export default function StickerModal({ deviceId, onClose }: StickerModalProps) {
  const [data, setData] = useState<StickerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSticker = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/devices/${deviceId}/sticker`);
        if (!res.ok) {
          throw new Error('Fehler beim Laden');
        }
        const json = await res.json();
        setData(json);
        setError(null);
      } catch {
        setError('Sticker konnte nicht generiert werden');
      } finally {
        setLoading(false);
      }
    };

    fetchSticker();
  }, [deviceId]);

  const handlePrint = () => {
    if (!printRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const styles = `
      <style>
        @page {
          size: 62mm 29mm;
          margin: 0;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .sticker {
          width: 62mm;
          height: 29mm;
          padding: 2mm;
          display: flex;
          align-items: center;
          gap: 2mm;
          background: white;
        }
        .qr-container {
          flex-shrink: 0;
          width: 23mm;
          height: 23mm;
        }
        .qr-container img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 1mm;
        }
        .inventar-code {
          font-size: 14pt;
          font-weight: 700;
          color: #9ab02e;
          line-height: 1.1;
        }
        .sno {
          font-size: 7pt;
          color: #374151;
          line-height: 1.2;
        }
        .sno-label {
          color: #9ca3af;
        }
        .details {
          font-size: 6pt;
          color: #6b7280;
          line-height: 1.3;
        }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Inventar-Sticker ${data?.device.inventarCode}</title>
          ${styles}
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary-dark" />
            <span className="font-semibold text-gray-900">Inventar-Sticker</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary-dark animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : data ? (
            <>
              {/* Sticker Preview */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-xs text-gray-500 mb-2 text-center">Vorschau (62mm × 29mm)</p>
                <div
                  ref={printRef}
                  className="mx-auto bg-white border border-gray-200 rounded-lg overflow-hidden"
                  style={{ width: '248px', height: '116px' }}
                >
                  <div className="sticker flex items-center gap-3 p-2 h-full">
                    <div className="qr-container flex-shrink-0" style={{ width: '92px', height: '92px' }}>
                      <img
                        src={data.qrCode}
                        alt="QR Code"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="info flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                      <div className="inventar-code text-primary-dark font-bold text-lg leading-tight">
                        {data.device.inventarCode}
                      </div>
                      <div className="sno text-gray-700 text-[10px] leading-tight">
                        <span className="text-gray-400">S/N:</span> {data.device.sno}
                      </div>
                      <div className="details text-gray-500 text-[10px] leading-tight">
                        {[data.device.hsName, data.device.modelName].filter(Boolean).join(' ')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* URL Info */}
              <div className="bg-primary/10 rounded-lg p-3 mb-4">
                <p className="text-xs text-primary-dark font-medium mb-1">QR-Code führt zu:</p>
                <p className="text-xs text-primary-dark break-all font-mono">{data.url}</p>
              </div>

              {/* Print Button */}
              <button
                onClick={handlePrint}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-secondary rounded-xl font-medium hover:bg-primary-dark transition-colors"
              >
                <Printer className="w-5 h-5" />
                Sticker drucken
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
