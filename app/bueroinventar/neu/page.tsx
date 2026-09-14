'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';

interface Category {
  ID: number;
  Name: string;
}

interface User {
  id: number;
  name: string;
}

interface Room {
  id: number;
  name: string;
  standort: string | null;
  branch: string | null;
}

export default function NewOfficeInventoryPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const [kategorieId, setKategorieId] = useState('');
  const [bezeichnung, setBezeichnung] = useState('');
  const [beschreibung, setBeschreibung] = useState('');
  const [inventarNr, setInventarNr] = useState('');
  const [seriennummer, setSeriennummer] = useState('');
  const [hersteller, setHersteller] = useState('');
  const [modell, setModell] = useState('');
  const [anschaffungsdatum, setAnschaffungsdatum] = useState('');
  const [anschaffungspreis, setAnschaffungspreis] = useState('');
  const [zustand, setZustand] = useState('GUT');
  const [raumId, setRaumId] = useState('');
  const [benutzerId, setBenutzerId] = useState('');
  const [notiz, setNotiz] = useState('');

  useEffect(() => {
    loadCategories();
    loadUsers();
    loadRooms();
  }, []);

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
    setError(null);
    setSaving(true);

    try {
      const res = await fetch('/api/office-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kategorieId: parseInt(kategorieId),
          bezeichnung,
          beschreibung: beschreibung || null,
          inventarNr: inventarNr || null,
          seriennummer: seriennummer || null,
          hersteller: hersteller || null,
          modell: modell || null,
          anschaffungsdatum: anschaffungsdatum || null,
          anschaffungspreis: anschaffungspreis ? parseFloat(anschaffungspreis) : null,
          zustand,
          raumId: raumId ? parseInt(raumId) : null,
          benutzerId: benutzerId ? parseInt(benutzerId) : null,
          notiz: notiz || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Speichern');
      }

      router.push('/bueroinventar');
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/bueroinventar"
          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zur Übersicht
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Neues Büroinventar</h1>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategorie <span className="text-red-500">*</span>
            </label>
            <select
              value={kategorieId}
              onChange={(e) => setKategorieId(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Bitte wählen...</option>
              {categories.map((cat) => (
                <option key={cat.ID} value={cat.ID}>
                  {cat.Name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bezeichnung <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={bezeichnung}
              onChange={(e) => setBezeichnung(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Beschreibung</label>
            <textarea
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Inventar-Nr</label>
            <input
              type="text"
              value={inventarNr}
              onChange={(e) => setInventarNr(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Seriennummer</label>
            <input
              type="text"
              value={seriennummer}
              onChange={(e) => setSeriennummer(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hersteller</label>
            <input
              type="text"
              value={hersteller}
              onChange={(e) => setHersteller(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Modell</label>
            <input
              type="text"
              value={modell}
              onChange={(e) => setModell(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Anschaffungsdatum</label>
            <input
              type="date"
              value={anschaffungsdatum}
              onChange={(e) => setAnschaffungsdatum(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Anschaffungspreis (€)</label>
            <input
              type="number"
              step="0.01"
              value={anschaffungspreis}
              onChange={(e) => setAnschaffungspreis(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Zustand</label>
            <select
              value={zustand}
              onChange={(e) => setZustand(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="GUT">Gut</option>
              <option value="BESCHAEDIGT">Beschädigt</option>
              <option value="DEFEKT">Defekt</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Raum</label>
            <select
              value={raumId}
              onChange={(e) => setRaumId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Kein Raum</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} {room.branch && `(${room.branch})`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Benutzer</label>
            <select
              value={benutzerId}
              onChange={(e) => setBenutzerId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Kein Benutzer</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notiz</label>
            <textarea
              value={notiz}
              onChange={(e) => setNotiz(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
          <Link
            href="/bueroinventar"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all"
          >
            <Save className="h-5 w-5" />
            {saving ? 'Speichert...' : 'Speichern'}
          </button>
        </div>
      </form>
    </div>
  );
}
