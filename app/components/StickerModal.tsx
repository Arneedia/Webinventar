'use client';

import { useEffect, useState, useRef } from 'react';
import { X, Printer, Loader2, QrCode, Settings } from 'lucide-react';

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

interface StickerTemplate {
  id: string;
  name: string;
  description: string;
  layout: 'compact' | 'standard' | 'detailed' | 'custom';
  size: 'small' | 'medium' | 'large' | 'custom';
  customWidth?: number;
  customHeight?: number;
  showQR: boolean;
  showInventarCode: boolean;
  showSNO: boolean;
  showHersteller: boolean;
  showModell: boolean;
  showHardwareTyp: boolean;
  qrSize: number;
  fontSize: number;
  padding: number;
  gap: number;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  isDefault: boolean;
}

interface StickerPreferences {
  templateId: string;
  quantity: number;
}

const STORAGE_KEY = 'sticker-preferences';

const sizeConfig = {
  small: { width: 38, height: 29, label: 'Klein (38mm × 29mm)' },
  medium: { width: 62, height: 29, label: 'Standard (62mm × 29mm)' },
  large: { width: 100, height: 50, label: 'Groß (100mm × 50mm)' },
};

export default function StickerModal({ deviceId, onClose }: StickerModalProps) {
  const [data, setData] = useState<StickerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  
  const [templates, setTemplates] = useState<StickerTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  // Load templates from API
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setTemplatesLoading(true);
        const res = await fetch('/api/sticker-templates');
        if (res.ok) {
          const data = await res.json();
          setTemplates(data);
          
          // Load saved preference or use default template
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const prefs = JSON.parse(stored);
            const templateExists = data.find((t: StickerTemplate) => t.id === prefs.templateId);
            if (templateExists) {
              setSelectedTemplateId(prefs.templateId);
              setQuantity(prefs.quantity || 1);
              return;
            }
          }
          
          // Use default template
          const defaultTemplate = data.find((t: StickerTemplate) => t.isDefault);
          if (defaultTemplate) {
            setSelectedTemplateId(defaultTemplate.id);
          } else if (data.length > 0) {
            setSelectedTemplateId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load templates:', err);
      } finally {
        setTemplatesLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    if (selectedTemplateId && typeof window !== 'undefined') {
      const prefs: StickerPreferences = { templateId: selectedTemplateId, quantity };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    }
  }, [selectedTemplateId, quantity]);

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

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  const getSizeConfig = () => {
    if (!selectedTemplate) return { width: 62, height: 29 };
    if (selectedTemplate.size === 'custom') {
      return {
        width: selectedTemplate.customWidth || 62,
        height: selectedTemplate.customHeight || 29,
      };
    }
    const sizeMap = {
      small: { width: 38, height: 29 },
      medium: { width: 62, height: 29 },
      large: { width: 100, height: 50 },
    };
    return sizeMap[selectedTemplate.size] || { width: 62, height: 29 };
  };

  const handlePrint = () => {
    if (!printRef.current || !selectedTemplate) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const config = getSizeConfig();
    const maxQrHeight = config.height - (selectedTemplate.padding || 8) * 2;
    const qrSize = Math.min(maxQrHeight * (selectedTemplate.qrSize / 100), config.height * 0.85);
    const fontSize = (selectedTemplate.fontSize || 100) / 100;

    const styles = `
      <style>
        @page {
          size: ${config.width}mm ${config.height}mm;
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
          width: ${config.width}mm;
          height: ${config.height}mm;
          padding: ${selectedTemplate.padding}mm;
          display: flex;
          align-items: center;
          gap: ${selectedTemplate.gap}mm;
          background: ${selectedTemplate.backgroundColor};
          page-break-after: always;
        }
        .sticker:last-child {
          page-break-after: auto;
        }
        .qr-container {
          flex-shrink: 0;
          width: ${qrSize}mm;
          height: ${qrSize}mm;
          background: white;
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
          gap: 0.5mm;
        }
        .inventar-code {
          font-size: ${14 * fontSize}pt;
          font-weight: 700;
          color: ${selectedTemplate.primaryColor};
          line-height: 1.1;
        }
        .sno {
          font-size: ${7 * fontSize}pt;
          color: ${selectedTemplate.secondaryColor};
          line-height: 1.2;
        }
        .sno-label {
          opacity: 0.6;
        }
        .details {
          font-size: ${6 * fontSize}pt;
          color: ${selectedTemplate.secondaryColor};
          opacity: 0.75;
          line-height: 1.3;
        }
        .extra-details {
          font-size: ${5.5 * fontSize}pt;
          color: ${selectedTemplate.secondaryColor};
          opacity: 0.6;
          line-height: 1.3;
        }
      </style>
    `;

    const stickers = Array.from({ length: quantity }, (_, i) => printRef.current!.innerHTML).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Inventar-Sticker ${data?.device.inventarCode} (${quantity}x)</title>
          ${styles}
        </head>
        <body>
          ${stickers}
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
        <div className="p-4 max-h-[80vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary-dark animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : data && !templatesLoading ? (
            <>
              {/* Options */}
              <div className="space-y-4 mb-4">
                {/* Template Selection */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Vorlage</label>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                        {template.isDefault && ' (Standard)'}
                      </option>
                    ))}
                  </select>
                  {selectedTemplate?.description && (
                    <p className="text-[10px] text-gray-500 mt-1">{selectedTemplate.description}</p>
                  )}
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Anzahl</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Sticker Preview */}
              {selectedTemplate && (
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <p className="text-xs text-gray-500 mb-2 text-center">
                    Vorschau {quantity > 1 && `(${quantity} Stück)`}
                  </p>
                  <div
                    ref={printRef}
                    className="mx-auto border border-gray-200 rounded-lg shadow-sm"
                    style={{
                      width: `${getSizeConfig().width * 3.5}px`,
                      height: `${getSizeConfig().height * 3.5}px`,
                      overflow: 'hidden',
                      backgroundColor: selectedTemplate.backgroundColor,
                    }}
                  >
                    <div
                      className="sticker flex items-center h-full w-full"
                      style={{
                        padding: `${selectedTemplate.padding * (3.5 / 4)}px`,
                        gap: `${selectedTemplate.gap * (3.5 / 4)}px`,
                      }}
                    >
                      {selectedTemplate.showQR && (
                        <div
                          className="qr-container flex-shrink-0 bg-white"
                          style={{
                            width: `${(getSizeConfig().height - selectedTemplate.padding * 2) * (selectedTemplate.qrSize / 100) * 3.5}px`,
                            height: `${(getSizeConfig().height - selectedTemplate.padding * 2) * (selectedTemplate.qrSize / 100) * 3.5}px`,
                            minWidth: `${(getSizeConfig().height - selectedTemplate.padding * 2) * (selectedTemplate.qrSize / 100) * 3.5}px`,
                            minHeight: `${(getSizeConfig().height - selectedTemplate.padding * 2) * (selectedTemplate.qrSize / 100) * 3.5}px`,
                          }}
                        >
                          <img src={data.qrCode} alt="QR Code" className="w-full h-full object-contain" />
                        </div>
                      )}
                      <div className="info flex-1 min-w-0 flex flex-col justify-center" style={{ gap: '2px' }}>
                        {selectedTemplate.showInventarCode && (
                          <div
                            className="font-bold leading-tight truncate"
                            style={{
                              fontSize: `${14 * (selectedTemplate.fontSize / 100) * (3.5 / 4)}px`,
                              color: selectedTemplate.primaryColor,
                            }}
                          >
                            {data.device.inventarCode}
                          </div>
                        )}
                        {selectedTemplate.showSNO && (
                          <div
                            className="leading-tight truncate"
                            style={{
                              fontSize: `${7 * (selectedTemplate.fontSize / 100) * (3.5 / 4)}px`,
                              color: selectedTemplate.secondaryColor,
                            }}
                          >
                            <span className="opacity-60">S/N:</span> {data.device.sno}
                          </div>
                        )}
                        {selectedTemplate.showHersteller && selectedTemplate.showModell && (
                          <div
                            className="leading-tight truncate opacity-75"
                            style={{
                              fontSize: `${6 * (selectedTemplate.fontSize / 100) * (3.5 / 4)}px`,
                              color: selectedTemplate.secondaryColor,
                            }}
                          >
                            {[data.device.hsName, data.device.modelName].filter(Boolean).join(' ')}
                          </div>
                        )}
                        {selectedTemplate.showHardwareTyp && data.device.hwName && (
                          <div
                            className="leading-tight truncate opacity-60"
                            style={{
                              fontSize: `${5.5 * (selectedTemplate.fontSize / 100) * (3.5 / 4)}px`,
                              color: selectedTemplate.secondaryColor,
                            }}
                          >
                            {data.device.hwName}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* URL Info */}
              <div className="bg-primary/10 rounded-lg p-3 mb-4">
                <p className="text-xs text-primary-dark font-medium mb-1 flex items-center gap-1">
                  <Settings className="w-3 h-3" />
                  Einstellungen werden gespeichert
                </p>
                <p className="text-[10px] text-primary-dark/70">
                  Deine Layout-, Größen- und Anzahl-Einstellungen werden automatisch für das nächste Mal gespeichert.
                </p>
              </div>

              {/* Print Button */}
              <button
                onClick={handlePrint}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-secondary rounded-xl font-medium hover:bg-primary-dark transition-colors"
              >
                <Printer className="w-5 h-5" />
                {quantity > 1 ? `${quantity} Sticker drucken` : 'Sticker drucken'}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
