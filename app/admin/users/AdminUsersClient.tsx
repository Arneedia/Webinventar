'use client';

import { useCallback, useMemo, useState } from 'react';
import type { SerializableWebUser } from '@/lib/webUsers';

interface AdminUsersClientProps {
  initialUsers: SerializableWebUser[];
}

const roleOptions = [
  { value: 'ADMIN', label: 'Administrator' },
  { value: 'USER', label: 'Benutzer' },
] as const;

type RoleValue = (typeof roleOptions)[number]['value'];

export default function AdminUsersClient({ initialUsers }: AdminUsersClientProps) {
  const [users, setUsers] = useState<SerializableWebUser[]>(initialUsers);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<RoleValue>('USER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<RoleValue>('USER');
  const [editPassword, setEditPassword] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [isResettingId, setIsResettingId] = useState<number | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const formatDate = useCallback((value: string) => {
    return new Date(value).toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const adminCount = useMemo(() => users.filter((u) => u.role === 'ADMIN').length, [users]);

  const refreshUsers = useCallback(async () => {
    const res = await fetch('/api/webusers', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error('Benutzerliste konnte nicht geladen werden');
    }
    const data = await res.json();
    setUsers(Array.isArray(data.users) ? data.users : []);
  }, []);

  const startEdit = useCallback((user: SerializableWebUser) => {
    setEditingUserId(user.id);
    setEditEmail(user.email);
    setEditName(user.name ?? '');
    setEditRole(user.role as RoleValue);
    setEditPassword('');
    setError(null);
    setSuccess(null);
    setTempPassword(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingUserId(null);
    setEditPassword('');
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingUserId) return;
    setIsSavingEdit(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: Record<string, unknown> = {
        email: editEmail,
        name: editName,
        role: editRole,
      };

      if (editPassword.trim().length > 0) {
        payload.password = editPassword;
      }

      const res = await fetch(`/api/webusers/${editingUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const response = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(response.error ?? 'Benutzer konnte nicht aktualisiert werden');
      }

      await refreshUsers();
      setSuccess('Benutzer aktualisiert');
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsSavingEdit(false);
    }
  }, [editingUserId, editEmail, editName, editRole, editPassword, refreshUsers, cancelEdit]);

  const handleResetPassword = useCallback(async (user: SerializableWebUser) => {
    if (!window.confirm(`Passwort für "${user.email}" wirklich zurücksetzen?`)) {
      return;
    }

    setIsResettingId(user.id);
    setError(null);
    setSuccess(null);
    setTempPassword(null);

    try {
      const res = await fetch(`/api/webusers/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetPassword: true }),
      });

      const response = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(response.error ?? 'Passwort konnte nicht zurückgesetzt werden');
      }

      await refreshUsers();
      setTempPassword(response.tempPassword);
      setSuccess(`Passwort zurückgesetzt. Temporäres Passwort: ${response.tempPassword}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsResettingId(null);
    }
  }, [refreshUsers]);

  const handleDelete = useCallback(
    async (user: SerializableWebUser) => {
      if (!window.confirm(`Benutzer "${user.email}" wirklich löschen?`)) {
        return;
      }

      setIsDeletingId(user.id);
      setError(null);
      setSuccess(null);

      try {
        const res = await fetch(`/api/webusers/${user.id}`, { method: 'DELETE' });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload.error ?? 'Benutzer konnte nicht gelöscht werden');
        }

        if (editingUserId === user.id) {
          cancelEdit();
        }

        await refreshUsers();
        setSuccess('Benutzer gelöscht');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      } finally {
        setIsDeletingId(null);
      }
    },
    [refreshUsers, editingUserId, cancelEdit]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/webusers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password, role }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.error ?? 'Benutzer konnte nicht angelegt werden');
      }

      setEmail('');
      setName('');
      setPassword('');
      setRole('USER');
      setSuccess('Benutzer wurde angelegt');
      await refreshUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Registrierte Benutzer</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{users.length}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Admins</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{adminCount}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Neuen Benutzer anlegen</h2>
            <p className="text-sm text-gray-500">Zugangsdaten werden direkt aktiv.</p>
          </div>
        </div>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">E-Mail *</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">Passwort *</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">Rolle *</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as RoleValue)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              {roleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <div className="md:col-span-2 flex flex-col gap-3">
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-emerald-600">{success}</p>}
            {tempPassword && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-800">Temporäres Passwort:</p>
                <code className="mt-1 block rounded bg-white px-2 py-1 font-mono text-sm text-amber-900 select-all">
                  {tempPassword}
                </code>
                <p className="mt-2 text-xs text-amber-700">
                  Der Benutzer muss sich mit diesem Passwort anmelden und wird dann aufgefordert, ein neues Passwort festzulegen.
                </p>
              </div>
            )}
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {isSubmitting ? 'Speichert…' : 'Benutzer erstellen'}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-sm backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Benutzerübersicht</h2>
            <p className="text-sm text-gray-500">Nur Administratoren können diese Seite sehen.</p>
          </div>
          <button
            type="button"
            onClick={() => refreshUsers().catch((err) => setError(err.message))}
            className="rounded-full border border-gray-200 px-4 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Liste aktualisieren
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">E-Mail</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Rolle</th>
                <th className="px-4 py-3">Erstellt</th>
                <th className="px-4 py-3">Aktualisiert</th>
                <th className="px-4 py-3 text-center">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {editingUserId === user.id ? (
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    ) : (
                      user.email
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {editingUserId === user.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    ) : (
                      user.name ?? '—'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingUserId === user.id ? (
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as RoleValue)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                      >
                        {roleOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium ${
                          user.role === 'ADMIN'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {user.role === 'ADMIN' ? 'Administrator' : 'Benutzer'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(user.updatedAt)}</td>
                  <td className="px-4 py-3">
                    {editingUserId === user.id ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="password"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="Neues Passwort (optional)"
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            disabled={isSavingEdit}
                            className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300"
                          >
                            {isSavingEdit ? 'Speichert…' : 'Speichern'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => startEdit(user)}
                          className="rounded-full border border-gray-200 px-3 py-1 font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Bearbeiten
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetPassword(user)}
                          disabled={isResettingId === user.id}
                          className="rounded-full border border-amber-200 px-3 py-1 font-medium text-amber-600 hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-amber-100 disabled:text-amber-300"
                        >
                          {isResettingId === user.id ? 'Setzt zurück…' : 'PW Reset'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(user)}
                          disabled={isDeletingId === user.id}
                          className="rounded-full border border-red-200 px-3 py-1 font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-red-100 disabled:text-red-300"
                        >
                          {isDeletingId === user.id ? 'Löscht…' : 'Löschen'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                    Keine Benutzer vorhanden.
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
