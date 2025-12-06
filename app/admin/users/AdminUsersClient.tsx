'use client';

import { useCallback, useMemo, useState } from 'react';
import type { SerializableWebUser } from '@/lib/webUsers';
import type { SerializablePermissionGroup } from '@/lib/permissionGroups';

interface AdminUsersClientProps {
  initialUsers: SerializableWebUser[];
  allPermissionGroups: SerializablePermissionGroup[];
}

const roleOptions = [
  { value: 'ADMIN', label: 'Administrator' },
  { value: 'USER', label: 'Benutzer' },
] as const;

type RoleValue = (typeof roleOptions)[number]['value'];

export default function AdminUsersClient({ initialUsers, allPermissionGroups }: AdminUsersClientProps) {
  const [users, setUsers] = useState<SerializableWebUser[]>(initialUsers);
  const [permissionGroups] = useState<SerializablePermissionGroup[]>(allPermissionGroups);
  const [managingGroupsUserId, setManagingGroupsUserId] = useState<number | null>(null);
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

  const handleAddToGroup = useCallback(
    async (userId: number, groupId: number) => {
      setError(null);
      setSuccess(null);

      try {
        const res = await fetch(`/api/permission-groups/${groupId}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error ?? 'Benutzer konnte nicht zur Gruppe hinzugefügt werden');
        }

        await refreshUsers();
        setSuccess('Benutzer zur Rechtegruppe hinzugefügt');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      }
    },
    [refreshUsers]
  );

  const handleRemoveFromGroup = useCallback(
    async (userId: number, groupId: number) => {
      setError(null);
      setSuccess(null);

      try {
        const res = await fetch(`/api/permission-groups/${groupId}/users?userId=${userId}`, {
          method: 'DELETE',
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error ?? 'Benutzer konnte nicht aus der Gruppe entfernt werden');
        }

        await refreshUsers();
        setSuccess('Benutzer aus Rechtegruppe entfernt');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      }
    },
    [refreshUsers]
  );

  const managingUser = managingGroupsUserId
    ? users.find((u) => u.id === managingGroupsUserId)
    : null;

  const availableGroupsForUser = useMemo(() => {
    if (!managingUser) return [];
    const userGroupIds = new Set(managingUser.permissionGroups?.map((g) => g.id) ?? []);
    return permissionGroups.filter((g) => !userGroupIds.has(g.id));
  }, [managingUser, permissionGroups]);

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
            <span className="text-primary-dark">E-Mail *</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-dark focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-primary-dark">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-dark focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-primary-dark">Passwort *</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-dark focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-primary-dark">Rolle *</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as RoleValue)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary-dark focus:outline-none"
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
                className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/100 disabled:cursor-not-allowed disabled:bg-primary/20"
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
                <th className="px-4 py-3">Rechtegruppen</th>
                <th className="px-4 py-3">Erstellt</th>
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
                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-primary-dark focus:outline-none"
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
                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-primary-dark focus:outline-none"
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
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-primary-dark focus:outline-none"
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
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.permissionGroups && user.permissionGroups.length > 0 ? (
                        user.permissionGroups.map((group) => (
                          <span
                            key={group.id}
                            className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700"
                          >
                            {group.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">Keine</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-primary-dark">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    {editingUserId === user.id ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="password"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="Neues Passwort (optional)"
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-primary-dark focus:outline-none"
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
                          onClick={() => setManagingGroupsUserId(user.id)}
                          className="rounded-full border border-purple-200 px-3 py-1 font-medium text-purple-600 hover:bg-purple-50"
                        >
                          Gruppen
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
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                    Keine Benutzer vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Rechtegruppen-Verwaltung Modal */}
      {managingUser && (
        <section className="rounded-2xl border border-purple-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Rechtegruppen für {managingUser.name || managingUser.email}
              </h2>
              <p className="text-sm text-gray-500">
                Weisen Sie dem Benutzer Rechtegruppen zu oder entfernen Sie diese.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setManagingGroupsUserId(null)}
              className="rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Aktuelle Gruppen */}
          <div className="mb-6">
            <h3 className="mb-2 text-sm font-medium text-gray-700">Zugewiesene Gruppen</h3>
            {managingUser.permissionGroups && managingUser.permissionGroups.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {managingUser.permissionGroups.map((group) => (
                  <span
                    key={group.id}
                    className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-800"
                  >
                    {group.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveFromGroup(managingUser.id, group.id)}
                      className="ml-1 rounded-full p-0.5 hover:bg-purple-200"
                      title="Aus Gruppe entfernen"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Keine Rechtegruppen zugewiesen.</p>
            )}
          </div>

          {/* Gruppe hinzufügen */}
          {availableGroupsForUser.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-700">Gruppe hinzufügen</h3>
              <div className="flex flex-wrap gap-2">
                {availableGroupsForUser.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => handleAddToGroup(managingUser.id, group.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-white px-3 py-1 text-sm font-medium text-purple-700 hover:bg-purple-50"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {group.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {permissionGroups.length === 0 && (
            <p className="text-sm text-gray-500">
              Keine Rechtegruppen vorhanden.{' '}
              <a href="/admin/permission-groups" className="text-purple-600 hover:underline">
                Rechtegruppen erstellen
              </a>
            </p>
          )}
        </section>
      )}
    </div>
  );
}
