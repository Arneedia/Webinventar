'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Package, ArrowLeft, Save, Loader2 } from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';
import SearchableSelectWithCustom from '../../components/SearchableSelectWithCustom';

interface Category {
  ID: number;
  Name: string;
  Beschreibung: string | null;
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
  nummer: string | null;
}

interface OfficeItem {
  ID: number;
  KategorieID: number;
  Bezeichnung: string;
  Beschreibung: string | null;
  InventarNr: string | null;
  Seriennummer: string | null;
  Hersteller: string | null;
  Modell: string | null;
  Anschaffungsdatum: string | null;
  Anschaffungspreis: number | null;
  Zustand: string | null;
  RaumID: number | null;
  BenutzerID: number | null;
  Notiz: string | null;
}

export default function EditOfficeInventoryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [manufacturers, setManufacturers] = useState<ManufacturerOption[]>([]);
  const [models, setModels] = useState<ModelOption[]>([]);

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

  useEffect(() => {
    loadItem();
    loadCategories();
    loadUsers();
    loadRooms();
    loadManufacturers();
    loadAllModels();
  }, [id]);

  // Hersteller laden
  async function loadManufacturers() {
    try {
      const res = await fetch('/api/office-manufacturers?includeAll=true');
      if (res.ok) {
        const data = await res.json();
        const manufacturersArray = data.manufacturers || [];
        setManufacturers(manufacturersArray.sort((a: ManufacturerOption, b: ManufacturerOption) => 
          a.name.localeCompare(b.name, 'de')
        ));
      }
    } catch (err) {
      console.error('Fehler beim Laden der Hersteller:', err);
    }
  }

  // Alle Modelle laden
  async function loadAllModels() {
    try {
      const res = await fetch('/api/tables/MOD?bereich=BUERO');
      if (res.ok) {
        const data = await res.json();
        const modArray = data.data || [];
        setModels(modArray.map((m: any) => ({ 
          id: m.ModID, 
          name: m.ModName || `Modell ${m.ModID}`,
          nummer: m.ModellNummer
        })).sort((a: ModelOption, b: ModelOption) => a.name.localeCompare(b.name, 'de')));
      }
    } catch (err) {
      console.error('Fehler beim Laden der Modelle:', err);
    }
  }

  async function loadItem() {
    try {
      setLoading(true);
      const res = await fetch(`/api/office-inventory/${id}`);
      if (!res.ok) throw new Error('Fehler beim Laden');
      const data: OfficeItem = await res.json();

      // Datum formatieren für input type="date"
      let formattedDate = '';
      if (data.Anschaffungsdatum) {
        const date = new Date(data.Anschaffungsdatum);
        formattedDate = date.toISOString().split('T')[0];
      }

      setFormData({
        kategorieId: String(data.KategorieID || ''),
        bezeichnung: data.Bezeichnung || '',
        beschreibung: data.Beschreibung || '',
        inventarNr: data.InventarNr || '',
        seriennummer: data.Seriennummer || '',
        hersteller: data.Hersteller || '',
        modell: data.Modell || '',
        anschaffungsdatum: formattedDate,
        anschaffungspreis: data.Anschaffungspreis ? String(data.Anschaffungspreis) : '',
        zustand: data.Zustand || 'GUT',
        raumId: data.RaumID ? String(data.RaumID) : '',
        benutzerId: data.BenutzerID ? String(data.BenutzerID) : '',
        notiz: data.Notiz || '',
      });
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const res = await fetch('/api/office-categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Kategorien:', err);
    }
  }

  async function loadUsers() {
    try {
      const res = await fetch('/api/inventory-users');
      if (res.ok) {
        const data = await res.json();
        const usersArray = data.users || [];
        setUsers(usersArray.map((u: any) => ({ id: u.id, name: u.name })));
      }
    } catch (err) {
      console.error('Fehler beim Laden der Benutzer:', err);
    }
  }

  async function loadRooms() {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        const roomsArray = data.rooms || [];
        setRooms(
          roomsArray.map((r: any) => ({
            id: r.RaumID,
            name: r.RaumName,
            standort: r.Standort,
            branch: r.GS?.GSName,
          }))
        );
      }
    } catch (err) {
      console.error('Fehler beim Laden der Räume:', err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
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

      const res = await fetch(`/api/office-inventory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.details || data.error || 'Fehler beim Speichern');
      }

      const responseData = await res.json();

      // Erfolgsm eldung mit Info über erstellte Relationen
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
      
      // Listen neu laden
      await loadManufacturers();
      await loadAllModels();
      
      setTimeout(() => {
        router.push('/bueroinventar');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Daten...</p>
        </div>
      </div>
    );
  }

  if (error && !formData.bezeichnung) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Fehler: {error}
        </div>
        <Link
          href="/bueroinventar"
          className="mt-4 inline-flex items-center gap-2 text-purple-600 hover:text-purple-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/bueroinventar"
          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg">
            <Package className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Büroinventar bearbeiten</h1>
            <p className="text-gray-600">Eintrag #{id} bearbeiten</p>
          </div>
        </div>
      </div>

      {/* Erfolgs-/Fehlermeldungen */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-green-800">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-800">
          {error}
        </div>
      )}

      {/* Formular */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg border border-purple-200 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="z.B. INV-2026-001"
            />
          </div>

          {/* Hersteller */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hersteller
            </label>
            <SearchableSelectWithCustom
              options={manufacturers.map(m => ({ value: m.name, label: m.name }))}
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
              options={models.map(m => ({ value: m.name, label: m.name }))}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="0.00"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Zusätzliche Informationen..."
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
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Interne Notizen..."
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Speichern...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Änderungen speichern
              </>
            )}
          </button>
          <Link
            href="/bueroinventar"
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all inline-flex items-center"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}
