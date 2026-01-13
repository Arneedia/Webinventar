'use client';

import { useEffect, useMemo, useState } from 'react';
import type { InventoryLookups, SerializableInventoryUser } from '@/lib/inventoryUsers';

type FormState = {
  name: string;
  roomId: string;
  departmentId: string;
  statusId: string;
  branchId: string;
};

type InventoryUsersClientProps = {
  initialUsers: SerializableInventoryUser[];
  lookups: InventoryLookups;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export default function InventoryUsersClient({
  initialUsers,
  lookups,
  canCreate,
  canEdit,
  canDelete,
}: InventoryUsersClientProps) {
  const [users, setUsers] = useState<SerializableInventoryUser[]>(initialUsers);
  const [form, setForm] = useState<FormState>({
    name: '',
    roomId: '',
    departmentId: '',
    statusId: '',
    branchId: '',
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (editingId !== null) {
      const u = users.find((x) => x.id === editingId);
      if (u) {
        setForm({
          name: u.name ?? '',
          roomId: u.room?.id ? String(u.room.id) : '',
          departmentId: u.department?.id ? String(u.department.id) : '',
          statusId: u.status?.id ? String(u.status.id) : '',
          branchId: u.branch?.id ? String(u.branch.id) : '',
        });
      }
    } else {
      setForm({ name: '', roomId: '', departmentId: '', statusId: '', branchId: '' });
    }
  }, [editingId, users]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) =>
      [u.name, u.room?.name, u.department?.name, u.status?.name, u.branch?.name]
        .filter(Boolean)
        .some((v) => (v ?? '').toLowerCase().includes(term))
    );
  }, [users, search]);

  const resetFeedback = () => {
    setError(null);
    setSuccess(null);
  };

  const upsert = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!canCreate && editingId === null) return;
    if (!canEdit && editingId !== null) return;

    resetFeedback();
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim() || null,
        roomId: form.roomId ? Number(form.roomId) : null,
        departmentId: form.departmentId ? Number(form.departmentId) : null,
        statusId: form.statusId ? Number(form.statusId) : null,
        branchId: form.branchId ? Number(form.branchId) : null,
      };

      const url = editingId === null ? '/api/inventory-users' : `/api/inventory-users/${editingId}`;
      const res = await fetch(url, {
        method: editingId === null ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Aktion fehlgeschlagen');
      }
      const returnedUser: SerializableInventoryUser | undefined = data.user;
      if (returnedUser) {
        if (editingId === null) {
          setUsers((prev) => [returnedUser, ...prev]);
        } else {
          setUsers((prev) => prev.map((u) => (u.id === returnedUser.id ? returnedUser : u)));
        }
      }
      setSuccess(editingId === null ? 'Benutzer angelegt' : 'Benutzer aktualisiert');
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!canDelete) return;
    if (!confirm('Benutzer wirklich löschen?')) return;
    resetFeedback();
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory-users/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Löschen fehlgeschlagen');
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setSuccess('Benutzer gelöscht');
      if (editingId === id) setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId === null ? 'Neuen Inventar-Benutzer anlegen' : 'Inventar-Benutzer bearbeiten'}
            </h2>
            <p className="text-sm text-gray-500">Stammdaten des Mitarbeiters pflegen.</p>
          </div>
        </div>

        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={upsert}>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-primary-dark">Name</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-dark focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-primary-dark">Raum</span>
            <select
              value={form.roomId}
              onChange={(e) => setForm((p) => ({ ...p, roomId: e.target.value }))}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary-dark focus:outline-none"
            >
              <option value="">Kein Raum</option>
              {lookups.rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name ?? `Raum #${r.id}`}{r.standort ? ` (${r.standort})` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-primary-dark">Abteilung</span>
            <select
              value={form.departmentId}
              onChange={(e) => setForm((p) => ({ ...p, departmentId: e.target.value }))}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary-dark focus:outline-none"
            >
              <option value="">Keine</option>
              {lookups.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name ?? `Abteilung #${d.id}`}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-primary-dark">Status</span>
            <select
              value={form.statusId}
              onChange={(e) => setForm((p) => ({ ...p, statusId: e.target.value }))}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary-dark focus:outline-none"
            >
              <option value="">Kein Status</option>
              {lookups.statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name ?? `Status #${s.id}`}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-primary-dark">Geschäftsstelle</span>
            <select
              value={form.branchId}
              onChange={(e) => setForm((p) => ({ ...p, branchId: e.target.value }))}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary-dark focus:outline-none"
            >
              <option value="">Keine</option>
              {lookups.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name ?? `GS #${b.id}`}
                </option>
              ))}
            </select>
          </label>

          <div className="md:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={loading || (!canCreate && editingId === null) || (!canEdit && editingId !== null)}
              className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/100 disabled:cursor-not-allowed disabled:bg-primary/30"
            >
              {loading ? 'Speichert…' : editingId === null ? 'Anlegen' : 'Speichern'}
            </button>
            {editingId !== null && (
              <button
                type="button"
                className="text-sm text-gray-600 hover:text-gray-800"
                onClick={() => setEditingId(null)}
                disabled={loading}
              >
                Abbrechen
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Inventar-Benutzerübersicht</h2>
            <p className="text-sm text-gray-500">Mitarbeitende aus der Inventardatenbank.</p>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen..."
            className="w-full sm:w-64 rounded-full border border-gray-200 px-3 py-2 text-sm focus:border-primary-dark focus:outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Raum</th>
                <th className="px-4 py-3">Abteilung</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Geschäftsstelle</th>
                <th className="px-4 py-3 text-center">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.name ?? `Benutzer #${u.id}`}</td>
                  <td className="px-4 py-3 text-gray-700">{u.room?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{u.department?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{u.status?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{u.branch?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2 text-xs">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => setEditingId(u.id)}
                          className="rounded-full border border-gray-200 px-3 py-1 font-medium text-gray-700 hover:bg-gray-50"
                          disabled={loading}
                        >
                          Bearbeiten
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(u.id)}
                          className="rounded-full border border-red-200 px-3 py-1 font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed"
                          disabled={loading}
                        >
                          Löschen
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                    Keine Benutzer gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
