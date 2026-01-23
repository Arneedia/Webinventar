'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import PaginatedTable, { TableColumn } from '@/app/components/PaginatedTable';

interface RoomRecord {
  RaumID: number;
  RaumName: string | null;
  Standort: string | null;
  Notiz: string | null;
  GSID: number | null;
  GS?: { GSID: number; GSName: string | null } | null;
  RaumGefahrenstellen?: Array<{
    GefahrenstelleID: number;
    Gefahrenstelle: { GefahrenstelleID: number; Name: string };
  }>;
}

interface Geschaeftsstelle {
  GSID: number;
  GSName: string | null;
}

interface Gefahrenstelle {
  GefahrenstelleID: number;
  Name: string;
  Beschreibung: string | null;
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
  GSID: '',
  gefahrenstellen: [] as number[],
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
  const [geschaeftsstellen, setGeschaeftsstellen] = useState<Geschaeftsstelle[]>([]);
  const [gefahrenstellen, setGefahrenstellen] = useState<Gefahrenstelle[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/rooms', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Räume konnten nicht geladen werden');
      }
      const payload = await res.json();
      setRooms(payload.rooms ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLookups = useCallback(async () => {
    try {
      setLoadingLookups(true);
      const [gsRes, ghRes] = await Promise.all([
        fetch('/api/tables/GS', { cache: 'no-store' }),
        fetch('/api/gefahrenstellen', { cache: 'no-store' }),
      ]);
      if (gsRes.ok) {
        const gsData = await gsRes.json();
        setGeschaeftsstellen(gsData.data ?? []);
      }
      if (ghRes.ok) {
        const ghData = await ghRes.json();
        setGefahrenstellen(ghData.gefahrenstellen ?? []);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Lookups:', err);
    } finally {
      setLoadingLookups(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    fetchLookups();
  }, [fetchRooms, fetchLookups]);

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
    GSID: form.GSID ? Number(form.GSID) : null,
    gefahrenstellen: form.gefahrenstellen,
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
      const url = editingId ? `/api/rooms/${editingId}` : '/api/rooms';
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
      GSID: room.GSID ? String(room.GSID) : '',
      gefahrenstellen: room.RaumGefahrenstellen?.map(rg => rg.GefahrenstelleID) ?? [],
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
      const res = await fetch(`/api/rooms/${room.RaumID}`, { method: 'DELETE' });
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

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-700">Geschäftsstelle</span>
            <select
              value={form.GSID}
              onChange={(e) => handleChange('GSID', e.target.value)}
              disabled={loadingLookups}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 focus:border-primary focus:outline-none"
            >
              <option value="">Keine Geschäftsstelle</option>
              {geschaeftsstellen.map((gs) => (
                <option key={gs.GSID} value={gs.GSID}>
                  {gs.GSName ?? `GS #${gs.GSID}`}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-700">Gefahrenstellen</span>
            <select
              multiple
              value={form.gefahrenstellen.map(String)}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map(opt => Number(opt.value));
                setForm(prev => ({ ...prev, gefahrenstellen: selected }));
              }}
              disabled={loadingLookups}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 focus:border-primary focus:outline-none"
              size={4}
            >
              {gefahrenstellen.map((gh) => (
                <option key={gh.GefahrenstelleID} value={gh.GefahrenstelleID}>
                  {gh.Name}
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-500">Mehrfachauswahl mit Strg/Cmd</span>
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

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Bestehende Räume</h2>
          <span className="text-sm text-gray-500">{rooms.length} Einträge</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-gray-500 text-sm">Lade Räume…</span>
          </div>
        ) : (
          <PaginatedTable
            data={sortedRooms}
            columns={[
              {
                key: 'RaumName',
                label: 'Raum',
                sortable: true,
                searchable: true,
                render: (value, room) => (
                  <span className="font-medium text-gray-900">
                    {value || `Raum ${room.RaumID}`}
                  </span>
                ),
              },
              {
                key: 'Standort',
                label: 'Standort',
                sortable: true,
                searchable: true,
                render: (value) => value || '—',
              },
              {
                key: 'GS',
                label: 'Geschäftsstelle',
                sortable: true,
                searchable: true,
                render: (value) => value?.GSName || '—',
              },
              {
                key: 'RaumGefahrenstellen',
                label: 'Gefahrenstellen',
                sortable: false,
                searchable: true,
                render: (value) =>
                  value && value.length > 0
                    ? value.map((rg: any) => rg.Gefahrenstelle.Name).join(', ')
                    : '—',
              },
              {
                key: 'Notiz',
                label: 'Notiz',
                sortable: false,
                searchable: true,
                render: (value) =>
                  value ? <span className="line-clamp-2 max-w-md">{value}</span> : '—',
                className: 'max-w-md',
              },
              {
                key: 'RaumID',
                label: 'Aktionen',
                sortable: false,
                render: (_, room) => (
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => handleEdit(room)}
                      className="text-primary-dark hover:underline text-xs font-medium"
                    >
                      Bearbeiten
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(room)}
                      disabled={deletingId === room.RaumID}
                      className="text-red-600 hover:underline disabled:text-red-300 text-xs font-medium"
                    >
                      {deletingId === room.RaumID ? 'Löscht…' : 'Löschen'}
                    </button>
                  </div>
                ),
              },
            ]}
            keyExtractor={(room) => room.RaumID}
            emptyMessage="Noch keine Räume vorhanden."
            rowsPerPage={10}
            searchPlaceholder="Raum, Standort, Geschäftsstelle oder Notiz suchen..."
            showSearch={true}
          />
        )}
      </section>
    </div>
  );
}
