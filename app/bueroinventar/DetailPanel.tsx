'use client';

import { useState, useEffect } from 'react';
import { Edit2, User, MapPin, X, Save } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import SearchableSelectWithCustom from '../components/SearchableSelectWithCustom';

interface OfficeItem {
  id: number;
  kategorieId: number;
  kategorieName: string;
  bezeichnung: string;
  beschreibung: string | null;
  inventarNr: string | null;
  seriennummer: string | null;
  hersteller: string | null;
  modell: string | null;
  anschaffungsdatum: string | null;
  anschaffungspreis: number | null;
  zustand: string | null;
  raumId: number | null;
  raumName: string | null;
  raumStandort: string | null;
  raumBranch: string | null;
  benutzerId: number | null;
  benutzerName: string | null;
  notiz: string | null;
}

interface Category {
  ID: number;
  Name: string;
}

interface UserOption {
  id: number;
  name: string;
}

interface RoomOption {
  id: number;
  name: string;
  standort: string | null;
  branch: string | null;
}

interface ManufacturerOption {
  id: number;
  name: string;
}

interface ModelOption {
  id: number;
  name: string;
}

interface DetailPanelProps {
  item: OfficeItem;
  categories: Category[];
  users: UserOption[];
  rooms: RoomOption[];
  manufacturers: ManufacturerOption[];
  models: ModelOption[];
  onClose: () => void;
  onSave: () => void;
}

export default function DetailPanel({
  item,
  categories,
  users,
  rooms,
  manufacturers,
  models,
  onClose,
  onSave,
}: DetailPanelProps) {
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    kategorieId: '',
    bezeichnung: '',
    beschreibung: '',
    inventarNr: '',
    seriennummer: '',
    hersteller: '',
    modell: '',
    anschaffungsdatum: '',
    anschaffungspreis: '',
    zustand: 'GUT',
    raumId: '',
    benutzerId: '',
    notiz: '',
  });

  // Formular mit Item-Daten füllen
  useEffect(() => {
    if (editMode) {
      const formattedDate = item.anschaffungsdatum
        ? new Date(item.anschaffungsdatum).toISOString().split('T')[0]
        : '';

      setFormData({
        kategorieId: String(item.kategorieId || ''),
        bezeichnung: item.bezeichnung || '',
        beschreibung: item.beschreibung || '',
        inventarNr: item.inventarNr || '',
        seriennummer: item.seriennummer || '',
        hersteller: item.hersteller || '',
        modell: item.modell || '',
        anschaffungsdatum: formattedDate,
        anschaffungspreis: item.anschaffungspreis ? String(item.anschaffungspreis) : '',
        zustand: item.zustand || 'GUT',
        raumId: item.raumId ? String(item.raumId) : '',
        benutzerId: item.benutzerId ? String(item.benutzerId) : '',
        notiz: item.notiz || '',
      });
    }
  }, [editMode, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        kategorieId: Number(formData.kategorieId),
        bezeichnung: formData.bezeichnung,
        beschreibung: formData.beschreibung || null,
        inventarNr: formData.inventarNr || null,
        seriennummer: formData.seriennummer || null,
        hersteller: formData.hersteller || null,
        modell: formData.modell || null,
        anschaffungsdatum: formData.anschaffungsdatum || null,
        anschaffungspreis: formData.anschaffungspreis ? Number(formData.anschaffungspreis) : null,
        zustand: formData.zustand || 'GUT',
        raumId: formData.raumId ? Number(formData.raumId) : null,
        benutzerId: formData.benutzerId ? Number(formData.benutzerId) : null,
        notiz: formData.notiz || null,
      };

      const res = await fetch(`/api/office-inventory/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.details || data.error || 'Fehler beim Speichern');
      }

      const responseData = await res.json();

      let successMsg = 'Erfolgreich gespeichert!';
      if (responseData._meta?.herstellerCreated || responseData._meta?.modellCreated) {
        successMsg += ' (';
        if (responseData._meta.herstellerCreated) successMsg += 'Hersteller angelegt';
        if (responseData._meta.herstellerCreated && responseData._meta.modellCreated) successMsg += ', ';
        if (responseData._meta.modellCreated) successMsg += 'Modell angelegt';
        if (responseData._meta.relationCreated) successMsg += ', Verknüpfung erstellt';
        successMsg += ')';
      }

      setSuccess(successMsg);
      setEditMode(false);
      onSave();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-2xl border-l border-gray-200 overflow-y-auto z-50">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {editMode ? 'Bearbeiten' : 'Details'}
          </h2>
          <button
            onClick={() => {
              onClose();
              setEditMode(false);
              setError(null);
              setSuccess(null);
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-800 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-green-800 text-sm">
            {success}
          </div>
        )}

        {!editMode ? (
          /* Ansichtsmodus */
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Bezeichnung</div>
              <div className="font-semibold text-gray-900">{item.bezeichnung}</div>
            </div>

            {item.beschreibung && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Beschreibung</div>
                <div className="text-gray-900">{item.beschreibung}</div>
              </div>
            )}

            <div>
              <div className="text-sm text-gray-600 mb-1">Kategorie</div>
              <div className="text-gray-900">{item.kategorieName}</div>
            </div>

            {item.inventarNr && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Inventar-Nr</div>
                <div className="font-mono text-purple-600">{item.inventarNr}</div>
              </div>
            )}

            {item.seriennummer && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Seriennummer</div>
                <div className="font-mono text-gray-900">{item.seriennummer}</div>
              </div>
            )}

            {(item.hersteller || item.modell) && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Hersteller/Modell</div>
                <div className="text-gray-900">
                  {item.hersteller} {item.modell}
                </div>
              </div>
            )}

            {item.anschaffungsdatum && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Anschaffungsdatum</div>
                <div className="text-gray-900">
                  {new Date(item.anschaffungsdatum).toLocaleDateString('de-DE')}
                </div>
              </div>
            )}

            {item.anschaffungspreis && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Anschaffungspreis</div>
                <div className="text-gray-900">
                  {item.anschaffungspreis.toLocaleString('de-DE', {
                    style: 'currency',
                    currency: 'EUR',
                  })}
                </div>
              </div>
            )}

            {item.zustand && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Zustand</div>
                <div className="text-gray-900">{item.zustand}</div>
              </div>
            )}

            {item.benutzerName && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Zugewiesen an</div>
                <div className="flex items-center gap-2 text-gray-900">
                  <User className="h-4 w-4" />
                  {item.benutzerName}
                </div>
              </div>
            )}

            {item.raumName && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Raum</div>
                <div className="flex items-center gap-2 text-gray-900">
                  <MapPin className="h-4 w-4" />
                  <div>
                    <div>{item.raumName}</div>
                    {item.raumBranch && (
                      <div className="text-sm text-gray-500">{item.raumBranch}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {item.notiz && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Notiz</div>
                <div className="text-gray-900 text-sm bg-gray-50 p-3 rounded-lg">
                  {item.notiz}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                <Edit2 className="h-4 w-4" />
                Bearbeiten
              </button>
            </div>
          </div>
        ) : (
          /* Bearbeitungsmodus */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Kategorie */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kategorie <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={categories.map(cat => ({ value: String(cat.ID), label: cat.Name }))}
                value={formData.kategorieId}
                onChange={(value) => setFormData(prev => ({ ...prev, kategorieId: value }))}
                placeholder="-- Kategorie wählen --"
                searchPlaceholder="Kategorie suchen..."
                required
              />
            </div>

            {/* Bezeichnung */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bezeichnung <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.bezeichnung}
                onChange={(e) => setFormData(prev => ({ ...prev, bezeichnung: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                required
              />
            </div>

            {/* Inventarnummer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Inventarnummer
              </label>
              <input
                type="text"
                value={formData.inventarNr}
                onChange={(e) => setFormData(prev => ({ ...prev, inventarNr: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Hersteller */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hersteller
              </label>
              <SearchableSelectWithCustom
                options={manufacturers.map(m => ({ value: String(m.id), label: m.name }))}
                value={formData.hersteller}
                onChange={(value) => setFormData(prev => ({ ...prev, hersteller: value }))}
                placeholder="-- Hersteller wählen --"
                searchPlaceholder="Hersteller suchen..."
                customPlaceholder="Neuen Hersteller eingeben..."
                allowCustom={true}
              />
            </div>

            {/* Modell */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Modell
              </label>
              <SearchableSelectWithCustom
                options={models.map(m => ({ value: String(m.id), label: m.name }))}
                value={formData.modell}
                onChange={(value) => setFormData(prev => ({ ...prev, modell: value }))}
                placeholder="-- Modell wählen --"
                searchPlaceholder="Modell suchen..."
                customPlaceholder="Neues Modell eingeben..."
                allowCustom={true}
              />
            </div>

            {/* Seriennummer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seriennummer
              </label>
              <input
                type="text"
                value={formData.seriennummer}
                onChange={(e) => setFormData(prev => ({ ...prev, seriennummer: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Anschaffungsdatum */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anschaffungsdatum
              </label>
              <input
                type="date"
                value={formData.anschaffungsdatum}
                onChange={(e) => setFormData(prev => ({ ...prev, anschaffungsdatum: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Anschaffungspreis */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anschaffungspreis (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.anschaffungspreis}
                onChange={(e) => setFormData(prev => ({ ...prev, anschaffungspreis: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Zustand */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zustand
              </label>
              <select
                value={formData.zustand}
                onChange={(e) => setFormData(prev => ({ ...prev, zustand: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              >
                <option value="NEU">Neu</option>
                <option value="GUT">Gut</option>
                <option value="GEBRAUCHT">Gebraucht</option>
                <option value="REPARATUR">Reparatur</option>
                <option value="DEFEKT">Defekt</option>
              </select>
            </div>

            {/* Raum */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Raum
              </label>
              <SearchableSelect
                options={rooms.map(room => ({ 
                  value: String(room.id), 
                  label: `${room.name}${room.standort ? ` - ${room.standort}` : ''}${room.branch ? ` (${room.branch})` : ''}` 
                }))}
                value={formData.raumId}
                onChange={(value) => setFormData(prev => ({ ...prev, raumId: value }))}
                placeholder="-- Raum wählen --"
                searchPlaceholder="Raum suchen..."
              />
            </div>

            {/* Benutzer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zugewiesen an
              </label>
              <SearchableSelect
                options={users.map(user => ({ value: String(user.id), label: user.name }))}
                value={formData.benutzerId}
                onChange={(value) => setFormData(prev => ({ ...prev, benutzerId: value }))}
                placeholder="-- Benutzer wählen --"
                searchPlaceholder="Benutzer suchen..."
              />
            </div>

            {/* Beschreibung */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beschreibung
              </label>
              <textarea
                value={formData.beschreibung}
                onChange={(e) => setFormData(prev => ({ ...prev, beschreibung: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Notiz */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notiz
              </label>
              <textarea
                value={formData.notiz}
                onChange={(e) => setFormData(prev => ({ ...prev, notiz: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-4 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-colors text-sm"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Speichern...' : 'Speichern'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditMode(false);
                  setError(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Abbrechen
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
