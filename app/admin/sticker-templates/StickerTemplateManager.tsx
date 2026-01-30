'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Save, X, Eye, Copy, Settings, QrCode, AlertTriangle } from 'lucide-react';

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
  createdAt: string;
  updatedAt: string;
}

const defaultTemplate: Omit<StickerTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Neue Vorlage',
  description: '',
  layout: 'standard',
  size: 'medium',
  showQR: true,
  showInventarCode: true,
  showSNO: true,
  showHersteller: true,
  showModell: true,
  showHardwareTyp: false,
  qrSize: 80,
  fontSize: 100,
  padding: 8,
  gap: 8,
  primaryColor: '#9ab02e',
  secondaryColor: '#374151',
  backgroundColor: '#ffffff',
  isDefault: false,
};

const sizePresets = {
  small: { width: 38, height: 29, label: 'Klein (38mm × 29mm)' },
  medium: { width: 62, height: 29, label: 'Standard (62mm × 29mm)' },
  large: { width: 100, height: 50, label: 'Groß (100mm × 50mm)' },
  custom: { width: 62, height: 29, label: 'Benutzerdefiniert' },
};

export default function StickerTemplateManager() {
  const [templates, setTemplates] = useState<StickerTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<StickerTemplate>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/sticker-templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditing('new');
    setEditData({ ...defaultTemplate });
    setShowPreview(true);
  };

  const handleEdit = (template: StickerTemplate) => {
    setEditing(template.id);
    setEditData(template);
    setShowPreview(true);
  };

  const handleCancel = () => {
    setEditing(null);
    setEditData({});
    setShowPreview(false);
    setError(null);
  };

  const handleSave = async () => {
    try {
      setError(null);
      const isNew = editing === 'new';
      const url = isNew ? '/api/sticker-templates' : `/api/sticker-templates/${editing}`;
      const method = isNew ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Speichern');
      }

      setSuccess(isNew ? 'Vorlage erstellt!' : 'Vorlage aktualisiert!');
      setTimeout(() => setSuccess(null), 3000);
      handleCancel();
      loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Vorlage wirklich löschen?')) return;

    try {
      const res = await fetch(`/api/sticker-templates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Fehler beim Löschen');
      
      setSuccess('Vorlage gelöscht!');
      setTimeout(() => setSuccess(null), 3000);
      loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  };

  const handleDuplicate = (template: StickerTemplate) => {
    setEditing('new');
    setEditData({
      ...template,
      name: `${template.name} (Kopie)`,
      isDefault: false,
    });
    setShowPreview(true);
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/sticker-templates/${id}/set-default`, { method: 'POST' });
      if (!res.ok) throw new Error('Fehler beim Setzen als Standard');
      
      setSuccess('Standard-Vorlage gesetzt!');
      setTimeout(() => setSuccess(null), 3000);
      loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    }
  };

  const getSizeConfig = () => {
    if (editData.size === 'custom') {
      return {
        width: editData.customWidth || 62,
        height: editData.customHeight || 29,
      };
    }
    return sizePresets[editData.size || 'medium'];
  };

  const renderPreview = () => {
    if (!showPreview || !editData) return null;

    const config = getSizeConfig();
    const scale = 3.5; // Reduced scale for better fit
    const qrSizePercent = editData.qrSize || 80;
    // Calculate QR size relative to sticker height, ensuring it fits
    const maxQrHeight = config.height - (editData.padding || 8) * 2;
    const qrSize = Math.min(maxQrHeight * (qrSizePercent / 100), config.height * 0.85);
    const fontSize = (editData.fontSize || 100) / 100;

    return (
      <div className="bg-gray-50 rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-3 text-center">
          Live-Vorschau ({config.width}mm × {config.height}mm)
        </p>
        <div
          ref={previewRef}
          className="mx-auto bg-white border-2 border-gray-300 rounded-lg shadow-lg"
          style={{
            width: `${config.width * scale}px`,
            height: `${config.height * scale}px`,
            backgroundColor: editData.backgroundColor || '#ffffff',
            overflow: 'hidden',
          }}
        >
          <div
            className="flex items-center h-full w-full"
            style={{
              padding: `${(editData.padding || 8) * (scale / 4)}px`,
              gap: `${(editData.gap || 8) * (scale / 4)}px`,
            }}
          >
            {editData.showQR && (
              <div
                className="flex-shrink-0 bg-gray-200 rounded flex items-center justify-center"
                style={{
                  width: `${qrSize * scale}px`,
                  height: `${qrSize * scale}px`,
                  minWidth: `${qrSize * scale}px`,
                  minHeight: `${qrSize * scale}px`,
                }}
              >
                <QrCode className="w-3/4 h-3/4 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0 flex flex-col justify-center" style={{ gap: `${2 * (scale / 4)}px` }}>
              {editData.showInventarCode && (
                <div
                  className="font-bold leading-tight truncate"
                  style={{
                    fontSize: `${14 * fontSize * (scale / 4)}px`,
                    color: editData.primaryColor || '#9ab02e',
                  }}
                >
                  NB-0006
                </div>
              )}
              {editData.showSNO && (
                <div
                  className="leading-tight truncate"
                  style={{
                    fontSize: `${7 * fontSize * (scale / 4)}px`,
                    color: editData.secondaryColor || '#374151',
                  }}
                >
                  <span className="opacity-60">S/N:</span> ABC123456
                </div>
              )}
              {editData.showHersteller && editData.showModell && (
                <div
                  className="leading-tight opacity-75 truncate"
                  style={{
                    fontSize: `${6 * fontSize * (scale / 4)}px`,
                    color: editData.secondaryColor || '#374151',
                  }}
                >
                  Lenovo ThinkPad T14
                </div>
              )}
              {editData.showHardwareTyp && (
                <div
                  className="leading-tight opacity-60 truncate"
                  style={{
                    fontSize: `${5.5 * fontSize * (scale / 4)}px`,
                    color: editData.secondaryColor || '#374151',
                  }}
                >
                  Notebook
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sticker-Vorlagen</h1>
              <p className="text-sm text-gray-600">Erstelle und verwalte benutzerdefinierte Sticker-Layouts</p>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-secondary rounded-lg font-medium hover:bg-primary-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              Neue Vorlage
            </button>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
              {success}
            </div>
          )}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Template List */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h2 className="font-semibold text-gray-900">Vorhandene Vorlagen</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {loading ? (
                  <div className="p-8 text-center text-gray-500">Lade Vorlagen...</div>
                ) : templates.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    Noch keine Vorlagen vorhanden. Erstelle deine erste Vorlage!
                  </div>
                ) : (
                  templates.map((template) => (
                    <div key={template.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900">{template.name}</h3>
                            {template.isDefault && (
                              <span className="px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary-dark rounded-full">
                                Standard
                              </span>
                            )}
                          </div>
                          {template.description && (
                            <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 text-[10px] text-gray-500">
                            <span className="px-2 py-0.5 bg-gray-100 rounded">
                              {sizePresets[template.size]?.label || 'Benutzerdefiniert'}
                            </span>
                            <span className="px-2 py-0.5 bg-gray-100 rounded">
                              {template.layout === 'compact' ? 'Kompakt' : template.layout === 'detailed' ? 'Detailliert' : 'Standard'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {!template.isDefault && (
                            <button
                              onClick={() => handleSetDefault(template.id)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Als Standard setzen"
                            >
                              <Settings className="w-4 h-4 text-gray-600" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDuplicate(template)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Duplizieren"
                          >
                            <Copy className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleEdit(template)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Bearbeiten"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(template.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Löschen"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Editor */}
          {editing && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">
                    {editing === 'new' ? 'Neue Vorlage erstellen' : 'Vorlage bearbeiten'}
                  </h2>
                  <button onClick={handleCancel} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {/* Basic Info */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={editData.name || ''}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="z.B. Standard Laptop"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Beschreibung</label>
                    <textarea
                      value={editData.description || ''}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={2}
                      placeholder="Optionale Beschreibung..."
                    />
                  </div>

                  {/* Size */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Größe</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(sizePresets) as Array<keyof typeof sizePresets>).map((s) => (
                        <button
                          key={s}
                          onClick={() => setEditData({ ...editData, size: s })}
                          className={`px-3 py-2 text-xs rounded-lg border-2 transition-colors ${
                            editData.size === s
                              ? 'border-primary bg-primary/10 text-primary-dark font-medium'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {sizePresets[s].label.split('(')[0]}
                        </button>
                      ))}
                    </div>
                    {editData.size === 'custom' && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <label className="block text-[10px] text-gray-600 mb-1">Breite (mm)</label>
                          <input
                            type="number"
                            value={editData.customWidth || 62}
                            onChange={(e) => setEditData({ ...editData, customWidth: parseInt(e.target.value) })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-600 mb-1">Höhe (mm)</label>
                          <input
                            type="number"
                            value={editData.customHeight || 29}
                            onChange={(e) => setEditData({ ...editData, customHeight: parseInt(e.target.value) })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Content Options */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">Inhalt</label>
                    <div className="space-y-2">
                      {[
                        { key: 'showQR', label: 'QR-Code anzeigen' },
                        { key: 'showInventarCode', label: 'Inventar-Code' },
                        { key: 'showSNO', label: 'Seriennummer (SNO)' },
                        { key: 'showHersteller', label: 'Hersteller' },
                        { key: 'showModell', label: 'Modell' },
                        { key: 'showHardwareTyp', label: 'Hardware-Typ' },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editData[key as keyof typeof editData] as boolean}
                            onChange={(e) => setEditData({ ...editData, [key]: e.target.checked })}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-gray-700">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Styling */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">QR-Größe (%)</label>
                      <input
                        type="range"
                        min="50"
                        max="100"
                        value={editData.qrSize || 80}
                        onChange={(e) => setEditData({ ...editData, qrSize: parseInt(e.target.value) })}
                        className="w-full"
                      />
                      <span className="text-[10px] text-gray-500">{editData.qrSize || 80}%</span>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Schriftgröße (%)</label>
                      <input
                        type="range"
                        min="70"
                        max="130"
                        value={editData.fontSize || 100}
                        onChange={(e) => setEditData({ ...editData, fontSize: parseInt(e.target.value) })}
                        className="w-full"
                      />
                      <span className="text-[10px] text-gray-500">{editData.fontSize || 100}%</span>
                    </div>
                  </div>

                  {/* Colors */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-gray-700 mb-1">Primärfarbe</label>
                      <input
                        type="color"
                        value={editData.primaryColor || '#9ab02e'}
                        onChange={(e) => setEditData({ ...editData, primaryColor: e.target.value })}
                        className="w-full h-8 rounded border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-700 mb-1">Textfarbe</label>
                      <input
                        type="color"
                        value={editData.secondaryColor || '#374151'}
                        onChange={(e) => setEditData({ ...editData, secondaryColor: e.target.value })}
                        className="w-full h-8 rounded border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-700 mb-1">Hintergrund</label>
                      <input
                        type="color"
                        value={editData.backgroundColor || '#ffffff'}
                        onChange={(e) => setEditData({ ...editData, backgroundColor: e.target.value })}
                        className="w-full h-8 rounded border border-gray-300"
                      />
                    </div>
                  </div>

                  {/* Preview */}
                  {renderPreview()}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleSave}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-secondary rounded-lg font-medium hover:bg-primary-dark transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Speichern
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
