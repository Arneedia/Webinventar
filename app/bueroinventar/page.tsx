'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Package, Plus, Search, Edit2, Trash2, User, MapPin, Calendar, DollarSign, Tag, RotateCw } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import AutocompleteInput from '../components/AutocompleteInput';

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
  createdAt: string;
  updatedAt: string;
  letzteBewegungenCount: number;
}

interface Category {
  ID: number;
  Name: string;
  Beschreibung: string | null;
  _count: {
    Inventar: number;
  };
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

export default function OfficeInventoryPage() {
  const [items, setItems] = useState<OfficeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [zustandFilter, setZustandFilter] = useState('');

  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Neues Inventar Formular
  const [newItem, setNewItem] = useState({
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

  // Inventarnummer generieren
  async function generateInventarNr() {
    if (!newItem.kategorieId) return;
    try {
      const res = await fetch(`/api/office-inventory/next-number?kategorieId=${newItem.kategorieId}`);
      if (res.ok) {
        const data = await res.json();
        setNewItem(prev => ({ ...prev, inventarNr: data.inventarNr }));
      }
    } catch (err) {
      console.error('Fehler beim Generieren der Inventarnummer:', err);
    }
  }

  // Hersteller suchen
  async function searchManufacturers(query: string): Promise<string[]> {
    try {
      const params = new URLSearchParams({ search: query });
      if (newItem.kategorieId) {
        params.append('kategorieId', newItem.kategorieId);
      }
      const res = await fetch(`/api/office-manufacturers?${params}`);
      if (res.ok) {
        const data = await res.json();
        return data.manufacturers.map((m: any) => m.name);
      }
    } catch (err) {
      console.error('Fehler beim Suchen der Hersteller:', err);
    }
    return [];
  }

  // Modelle suchen
  async function searchModels(query: string): Promise<string[]> {
    try {
      const params = new URLSearchParams({ search: query });
      if (newItem.kategorieId) {
        params.append('kategorieId', newItem.kategorieId);
      }
      if (newItem.hersteller) {
        params.append('hersteller', newItem.hersteller);
      }
      const res = await fetch(`/api/office-models?${params}`);
      if (res.ok) {
        const data = await res.json();
        return data.models.map((m: any) => m.name);
      }
    } catch (err) {
      console.error('Fehler beim Suchen der Modelle:', err);
    }
    return [];
  }

  // Daten laden
  useEffect(() => {
    loadItems();
    loadCategories();
    loadUsers();
    loadRooms();
  }, []);

  async function loadItems() {
    try {
      setLoading(true);
      const res = await fetch('/api/office-inventory');
      if (!res.ok) throw new Error('Fehler beim Laden');
      const data = await res.json();
      setItems(data);
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
      console.error('Fehler beim Laden der RÃ¤ume:', err);
    }
  }

  async function deleteItem(id: number) {
    if (!confirm('Wirklich lÃ¶schen?')) return;
    try {
      const res = await fetch(`/api/office-inventory/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Fehler beim LÃ¶schen');
      await loadItems();
    } catch (err) {
      alert(String(err));
    }
  }

  async function handleCreateItem(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const payload = {
        kategorieId: Number(newItem.kategorieId),
        bezeichnung: newItem.bezeichnung,
        beschreibung: newItem.beschreibung || null,
        inventarNr: newItem.inventarNr || null,
        seriennummer: newItem.seriennummer || null,
        hersteller: newItem.hersteller || null,
        modell: newItem.modell || null,
        anschaffungsdatum: newItem.anschaffungsdatum || null,
        anschaffungspreis: newItem.anschaffungspreis ? Number(newItem.anschaffungspreis) : null,
        zustand: newItem.zustand || 'GUT',
        raumId: newItem.raumId ? Number(newItem.raumId) : null,
        benutzerId: newItem.benutzerId ? Number(newItem.benutzerId) : null,
        notiz: newItem.notiz || null,
      };

      const res = await fetch('/api/office-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.details || data.error || 'Fehler beim Erstellen');
      }

      // Formular zurÃ¼cksetzen
      setNewItem({
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

      setActionSuccess('Inventar erfolgreich erstellt!');
      await loadItems();
      setCreating(false);

      // Erfolgsm nachricht nach 3 Sekunden ausblenden
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Fehler beim Erstellen');
    } finally {
      setSaving(false);
    }
  }

  // Gefilterte Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.bezeichnung.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.inventarNr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.seriennummer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.hersteller?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.modell?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = !categoryFilter || item.kategorieId === parseInt(categoryFilter);
      const matchesUser = !userFilter || item.benutzerId === parseInt(userFilter);
      const matchesRoom = !roomFilter || item.raumId === parseInt(roomFilter);
      const matchesZustand = !zustandFilter || item.zustand === zustandFilter;

      return matchesSearch && matchesCategory && matchesUser && matchesRoom && matchesZustand;
    });
  }, [items, searchTerm, categoryFilter, userFilter, roomFilter, zustandFilter]);

  const selectedItem = items.find((i) => i.id === selectedItemId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Lade BÃ¼roinventar...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Fehler: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg">
              <Package className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">BÃ¼roinventar</h1>
              <p className="text-gray-600">Verwaltung von BÃ¼romÃ¶beln und -ausstattung</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setCreating(!creating);
              setActionError(null);
              setActionSuccess(null);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 shadow-lg transition-all"
          >
            <Plus className="h-5 w-5" />
            {creating ? 'Abbrechen' : 'Neues Inventar'}
          </button>
        </div>

        {/* Statistik */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <div className="text-sm text-gray-600">Gesamt</div>
            <div className="text-2xl font-bold text-gray-900">{items.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="text-sm text-gray-600">Zugewiesen</div>
            <div className="text-2xl font-bold text-gray-900">
              {items.filter((i) => i.benutzerId).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="text-sm text-gray-600">Kategorien</div>
            <div className="text-2xl font-bold text-gray-900">{categories.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
            <div className="text-sm text-gray-600">Gesamtwert</div>
            <div className="text-2xl font-bold text-gray-900">
              {items
                .reduce((sum, i) => sum + (i.anschaffungspreis || 0), 0)
                .toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
            </div>
          </div>
        </div>

        {/* Erfolgs-/Fehlermeldungen */}
        {actionSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-green-800">
            {actionSuccess}
          </div>
        )}
        {actionError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-800">
            {actionError}
          </div>
        )}

        {/* Neues Inventar Formular */}
        {creating && (
          <form onSubmit={handleCreateItem} className="bg-white rounded-lg shadow-lg border border-purple-200 p-6 mb-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Neues Inventar erstellen</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Kategorie */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategorie <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={categories.map(cat => ({ value: String(cat.ID), label: cat.Name }))}
                  value={newItem.kategorieId}
                  onChange={(value) => setNewItem(prev => ({ ...prev, kategorieId: value }))}
                  placeholder="-- Kategorie wÃ¤hlen --"
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
                  value={newItem.bezeichnung}
                  onChange={(e) => setNewItem(prev => ({ ...prev, bezeichnung: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Inventarnummer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inventarnummer
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newItem.inventarNr}
                    onChange={(e) => setNewItem(prev => ({ ...prev, inventarNr: e.target.value }))}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50"
                    placeholder="Automatisch generiert"
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={generateInventarNr}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Neu generieren"
                  >
                    <RotateCw className="h-4 w-4 text-purple-600" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Wird automatisch generiert</p>
              </div>

              {/* Hersteller */}
              <div>
                <AutocompleteInput
                  label="Hersteller"
                  value={newItem.hersteller}
                  onChange={(value) => setNewItem(prev => ({ ...prev, hersteller: value }))}
                  onSearch={searchManufacturers}
                  placeholder="Hersteller eingeben oder auswählen..."
                />
              </div>

              {/* Modell */}
              <div>
                <AutocompleteInput
                  label="Modell"
                  value={newItem.modell}
                  onChange={(value) => setNewItem(prev => ({ ...prev, modell: value }))}
                  onSearch={searchModels}
                  placeholder="Modell eingeben oder auswählen..."
                  disabled={!newItem.hersteller}
                />
                {!newItem.hersteller && (
                  <p className="text-xs text-gray-500 mt-1">Bitte zuerst Hersteller auswählen</p>
                )}
              </div>

              {/* Seriennummer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seriennummer
                </label>
                <input
                  type="text"
                  value={newItem.seriennummer}
                  onChange={(e) => setNewItem(prev => ({ ...prev, seriennummer: e.target.value }))}
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
                  value={newItem.anschaffungsdatum}
                  onChange={(e) => setNewItem(prev => ({ ...prev, anschaffungsdatum: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Anschaffungspreis */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Anschaffungspreis (â‚¬)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newItem.anschaffungspreis}
                  onChange={(e) => setNewItem(prev => ({ ...prev, anschaffungspreis: e.target.value }))}
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
                  value={newItem.zustand}
                  onChange={(e) => setNewItem(prev => ({ ...prev, zustand: e.target.value }))}
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
                  value={newItem.raumId}
                  onChange={(value) => setNewItem(prev => ({ ...prev, raumId: value }))}
                  placeholder="-- Raum wÃ¤hlen --"
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
                  value={newItem.benutzerId}
                  onChange={(value) => setNewItem(prev => ({ ...prev, benutzerId: value }))}
                  placeholder="-- Benutzer wÃ¤hlen --"
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
                value={newItem.beschreibung}
                onChange={(e) => setNewItem(prev => ({ ...prev, beschreibung: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="ZusÃ¤tzliche Informationen..."
              />
            </div>

            {/* Notiz */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notiz
              </label>
              <textarea
                value={newItem.notiz}
                onChange={(e) => setNewItem(prev => ({ ...prev, notiz: e.target.value }))}
                rows={2}
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
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Speichern...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Inventar erstellen
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setActionError(null);
                }}
                disabled={saving}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Abbrechen
              </button>
            </div>
          </form>
        )}

        {/* Filter */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Alle Kategorien</option>
              {categories.map((cat) => (
                <option key={cat.ID} value={cat.ID}>
                  {cat.Name} ({cat._count.Inventar})
                </option>
              ))}
            </select>

            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Alle Benutzer</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>

            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Alle RÃ¤ume</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} {room.branch && `(${room.branch})`}
                </option>
              ))}
            </select>

            <select
              value={zustandFilter}
              onChange={(e) => setZustandFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Alle ZustÃ¤nde</option>
              <option value="GUT">Gut</option>
              <option value="BESCHAEDIGT">BeschÃ¤digt</option>
              <option value="DEFEKT">Defekt</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabelle */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Inventar-Nr</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Kategorie</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Bezeichnung</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Hersteller/Modell</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Zustand</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Benutzer</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Raum</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Preis</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    Keine EintrÃ¤ge gefunden
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-purple-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedItemId(item.id)}
                  >
                    <td className="px-4 py-3 text-sm">
                      <div className="font-mono text-purple-600">{item.inventarNr || '-'}</div>
                      {item.seriennummer && (
                        <div className="text-xs text-gray-500">SN: {item.seriennummer}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {item.kategorieName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.bezeichnung}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.hersteller && <div>{item.hersteller}</div>}
                      {item.modell && <div className="text-xs text-gray-500">{item.modell}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.zustand === 'GUT' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Gut
                        </span>
                      )}
                      {item.zustand === 'BESCHAEDIGT' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          BeschÃ¤digt
                        </span>
                      )}
                      {item.zustand === 'DEFEKT' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Defekt
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.benutzerName || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.raumName ? (
                        <div>
                          <div>{item.raumName}</div>
                          {item.raumBranch && (
                            <div className="text-xs text-gray-500">{item.raumBranch}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.anschaffungspreis
                        ? item.anschaffungspreis.toLocaleString('de-DE', {
                            style: 'currency',
                            currency: 'EUR',
                          })
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/bueroinventar/${item.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteItem(item.id);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail-Panel (rechts) */}
      {selectedItem && (
        <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl border-l border-gray-200 overflow-y-auto z-50">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Details</h2>
              <button
                onClick={() => setSelectedItemId(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                âœ•
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Bezeichnung</div>
                <div className="font-semibold text-gray-900">{selectedItem.bezeichnung}</div>
              </div>

              {selectedItem.beschreibung && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Beschreibung</div>
                  <div className="text-gray-900">{selectedItem.beschreibung}</div>
                </div>
              )}

              <div>
                <div className="text-sm text-gray-600 mb-1">Kategorie</div>
                <div className="text-gray-900">{selectedItem.kategorieName}</div>
              </div>

              {selectedItem.inventarNr && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Inventar-Nr</div>
                  <div className="font-mono text-purple-600">{selectedItem.inventarNr}</div>
                </div>
              )}

              {selectedItem.seriennummer && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Seriennummer</div>
                  <div className="font-mono text-gray-900">{selectedItem.seriennummer}</div>
                </div>
              )}

              {(selectedItem.hersteller || selectedItem.modell) && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Hersteller/Modell</div>
                  <div className="text-gray-900">
                    {selectedItem.hersteller} {selectedItem.modell}
                  </div>
                </div>
              )}

              {selectedItem.anschaffungsdatum && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Anschaffungsdatum</div>
                  <div className="text-gray-900">
                    {new Date(selectedItem.anschaffungsdatum).toLocaleDateString('de-DE')}
                  </div>
                </div>
              )}

              {selectedItem.anschaffungspreis && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Anschaffungspreis</div>
                  <div className="text-gray-900">
                    {selectedItem.anschaffungspreis.toLocaleString('de-DE', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </div>
                </div>
              )}

              {selectedItem.zustand && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Zustand</div>
                  <div className="text-gray-900">{selectedItem.zustand}</div>
                </div>
              )}

              {selectedItem.benutzerName && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Zugewiesen an</div>
                  <div className="flex items-center gap-2 text-gray-900">
                    <User className="h-4 w-4" />
                    {selectedItem.benutzerName}
                  </div>
                </div>
              )}

              {selectedItem.raumName && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Raum</div>
                  <div className="flex items-center gap-2 text-gray-900">
                    <MapPin className="h-4 w-4" />
                    <div>
                      <div>{selectedItem.raumName}</div>
                      {selectedItem.raumBranch && (
                        <div className="text-sm text-gray-500">{selectedItem.raumBranch}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedItem.notiz && (
                <div>
                  <div className="text-sm text-gray-600 mb-1">Notiz</div>
                  <div className="text-gray-900 text-sm bg-gray-50 p-3 rounded-lg">
                    {selectedItem.notiz}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <Link
                  href={`/bueroinventar/${selectedItem.id}`}
                  className="block w-full text-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                >
                  Bearbeiten
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


