'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

interface Gefahrenstelle {
  GefahrenstelleID: number;
  Name: string;
  Beschreibung: string | null;
}

const emptyForm = {
  Name: '',
  Beschreibung: '',
};

export default function GefahrenstellenManager() {
  const [gefahrenstellen, setGefahrenstellen] = useState<Gefahrenstelle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchGefahrenstellen = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/gefahrenstellen', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Gefahrenstellen konnten nicht geladen werden');
      }
      const payload = await res.json();
      setGefahrenstellen(payload.gefahrenstellen ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      setGefahrenstellen([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGefahrenstellen();
  }, [fetchGefahrenstellen]);

  const resetFeedback = () => {
    setError(null);
    setSuccess(null);
  };

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const payloadFromForm = () => ({
    Name: form.Name.trim(),
    Beschreibung: form.Beschreibung.trim() || null,
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.Name.trim()) {
      setError('Bitte einen Namen angeben.');
      return;
    }

    resetFeedback();
    setSubmitting(true);

    try {
      const body = JSON.stringify(payloadFromForm());
      const url = editingId ? `/api/gefahrenstellen/${editingId}` : '/api/gefahrenstellen';
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

      setSuccess(editingId ? 'Gefahrenstelle aktualisiert' : 'Gefahrenstelle angelegt');
      setForm(emptyForm);
      setEditingId(null);
      fetchGefahrenstellen();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: Gefahrenstelle) => {
    setEditingId(item.GefahrenstelleID);
    setForm({
      Name: item.Name ?? '',
      Beschreibung: item.Beschreibung ?? '',
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

  const handleDelete = async (item: Gefahrenstelle) => {
    if (!confirm(`Gefahrenstelle "${item.Name}" wirklich löschen?`)) {
      return;
    }

    resetFeedback();
    setDeletingId(item.GefahrenstelleID);
    try {
      const res = await fetch(`/api/gefahrenstellen/${item.GefahrenstelleID}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Löschen fehlgeschlagen');
      }
      setSuccess('Gefahrenstelle gelöscht');
      if (editingId === item.GefahrenstelleID) {
        handleCancelEdit();
      }
      fetchGefahrenstellen();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Löschen fehlgeschlagen');
    } finally {
      setDeletingId(null);
    }
  };

  const sortedItems = useMemo(
    () => [...gefahrenstellen].sort((a, b) => (a.Name || '').localeCompare(b.Name || '')),
    [gefahrenstellen]
  );

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-primary-dark">Administration</p>
            <h1 className="text-2xl font-bold text-gray-900">Gefahrenstellen verwalten</h1>
            <p className="text-sm text-gray-500">Pflege die Stammdaten für Gefahrenstellen.</p>
          </div>
          <button
            type="button"
            onClick={() => fetchGefahrenstellen()}
            className="px-4 py-2 rounded-full border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
          >
            Aktualisieren
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-700">Name *</span>
            <input
              value={form.Name}
              onChange={(e) => handleChange('Name', e.target.value)}
              required
              className="rounded-lg border border-gray-200 px-3 py-2 focus:border-primary focus:outline-none"
              placeholder="z.B. Hochspannung"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-700">Beschreibung</span>
            <input
              value={form.Beschreibung}
              onChange={(e) => handleChange('Beschreibung', e.target.value)}
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
              {submitting ? 'Speichert…' : editingId ? 'Gefahrenstelle aktualisieren' : 'Gefahrenstelle anlegen'}
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
          <h2 className="text-lg font-semibold text-gray-900">Bestehende Gefahrenstellen</h2>
          <span className="text-sm text-gray-500">{gefahrenstellen.length} Einträge</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-gray-500 text-sm">Lade Gefahrenstellen…</span>
          </div>
        ) : gefahrenstellen.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">Noch keine Gefahrenstellen vorhanden.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Beschreibung</th>
                  <th className="px-6 py-3 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedItems.map((item) => (
                  <tr key={item.GefahrenstelleID} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{item.Name}</td>
                    <td className="px-6 py-3 text-gray-700">{item.Beschreibung || '—'}</td>
                    <td className="px-6 py-3 text-right space-x-3">
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="text-primary-dark hover:underline"
                      >
                        Bearbeiten
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        disabled={deletingId === item.GefahrenstelleID}
                        className="text-red-600 hover:underline disabled:text-red-300"
                      >
                        {deletingId === item.GefahrenstelleID ? 'Löscht…' : 'Löschen'}
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
