'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

interface RoomRecord {
  RaumID: number;
  RaumName: string | null;
  Standort: string | null;
  Notiz: string | null;
}

interface TableResponse {
  config: {
    primaryKey: string;
  };
  data: RoomRecord[];
}

const emptyForm = {
  RaumName: '',
  Standort: '',
  Notiz: '',
};

export default function RoomsManager() {
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/tables/RAUM', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Räume konnten nicht geladen werden');
      }
      const payload: TableResponse = await res.json();
      setRooms(payload.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const resetFeedback = () => {
    setError(null);
    setSuccess(null);
  };

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const payloadFromForm = () => ({
    RaumName: form.RaumName.trim() || null,
    Standort: form.Standort.trim() || null,
    Notiz: form.Notiz.trim() || null,
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.RaumName.trim()) {
      setError('Bitte einen Raumnamen angeben.');
      return;
    }

    resetFeedback();
    setSubmitting(true);

    try {
      const body = JSON.stringify(payloadFromForm());
      const url = editingId ? `/api/tables/RAUM/${editingId}` : '/api/tables/RAUM';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Speichern fehlgeschlagen');
      }

      setSuccess(editingId ? 'Raum aktualisiert' : 'Raum angelegt');
      setForm(emptyForm);
      setEditingId(null);
      fetchRooms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (room: RoomRecord) => {
    setEditingId(room.RaumID);
    setForm({
      RaumName: room.RaumName ?? '',
      Standort: room.Standort ?? '',
      Notiz: room.Notiz ?? '',
    });
    setSuccess(null);
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setSuccess(null);
    setError(null);
  };

  const handleDelete = async (room: RoomRecord) => {
    if (!confirm(`Raum "${room.RaumName ?? room.RaumID}" wirklich löschen?`)) {
      return;
    }

    resetFeedback();
    setDeletingId(room.RaumID);
    try {
      const res = await fetch(`/api/tables/RAUM/${room.RaumID}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Löschen fehlgeschlagen');
      }
      setSuccess('Raum gelöscht');
      if (editingId === room.RaumID) {
        handleCancelEdit();
      }
      fetchRooms();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen');
    } finally {
      setDeletingId(null);
    }
  };

  const sortedRooms = useMemo(
    () => [...rooms].sort((a, b) => (a.RaumName || '').localeCompare(b.RaumName || '')),
    [rooms]
  );

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-primary-dark">Administration</p>
            <h1 className="text-2xl font-bold text-gray-900">Räume verwalten</h1>
            <p className="text-sm text-gray-500">Pflege die Stammdaten für Standorte und Räume.</p>
          </div>
          <button
            type="button"
            onClick={() => fetchRooms()}
            className="px-4 py-2 rounded-full border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
          >
            Aktualisieren
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-700">Raumname *</span>
            <input
              value={form.RaumName}
              onChange={(e) => handleChange('RaumName', e.target.value)}
              required
              className="rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
              placeholder="z.B. IT-Lager"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-700">Standort / Etage</span>
            <input
              value={form.Standort}
              onChange={(e) => handleChange('Standort', e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
              placeholder="z.B. EG, 1. OG, usw."
            />
          </label>

          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            <span className="text-gray-700">Notiz</span>
            <textarea
              value={form.Notiz}
              onChange={(e) => handleChange('Notiz', e.target.value)}
              rows={3}
              className="rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
              placeholder="Optionale Beschreibung"
            />
          </label>

          <div className="md:col-span-2 flex flex-wrap gap-2 items-center">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark disabled:opacity-50"
            >
              {submitting ? 'Speichert…' : editingId ? 'Raum aktualisieren' : 'Raum anlegen'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="inline-flex items-center rounded-full border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Abbrechen
              </button>
            )}
            {error && <span className="text-sm text-red-600">{error}</span>}
            {success && !error && <span className="text-sm text-emerald-600">{success}</span>}
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Bestehende Räume</h2>
          <span className="text-sm text-gray-500">{rooms.length} Einträge</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-gray-500 text-sm">Lade Räume…</span>
          </div>
        ) : rooms.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">Noch keine Räume vorhanden.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-6 py-3">Raum</th>
                  <th className="px-6 py-3">Standort</th>
                  <th className="px-6 py-3">Notiz</th>
                  <th className="px-6 py-3 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedRooms.map((room) => (
                  <tr key={room.RaumID} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{room.RaumName || `Raum ${room.RaumID}`}</td>
                    <td className="px-6 py-3 text-gray-700">{room.Standort || '—'}</td>
                    <td className="px-6 py-3 text-gray-600 max-w-md">
                      {room.Notiz ? <span className="line-clamp-2">{room.Notiz}</span> : '—'}
                    </td>
                    <td className="px-6 py-3 text-right space-x-3">
                      <button
                        type="button"
                        onClick={() => handleEdit(room)}
                        className="text-primary-dark hover:underline"
                      >
                        Bearbeiten
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(room)}
                        disabled={deletingId === room.RaumID}
                        className="text-red-600 hover:underline disabled:text-red-300"
                      >
                        {deletingId === room.RaumID ? 'Löscht…' : 'Löschen'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
