'use client';

import { useCallback, useState } from 'react';
import type { SerializablePermissionGroup } from '@/lib/permissionGroups';
import { PermissionCategories } from '@/lib/permissionGroups';

interface PermissionGroupsClientProps {
  initialGroups: SerializablePermissionGroup[];
}

export default function PermissionGroupsClient({
  initialGroups,
}: PermissionGroupsClientProps) {
  const [groups, setGroups] = useState<SerializablePermissionGroup[]>(initialGroups);
  const [isCreating, setIsCreating] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [viewingGroupId, setViewingGroupId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  
  // UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const refreshGroups = useCallback(async () => {
    const res = await fetch('/api/permission-groups', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error('Rechtegruppen konnten nicht geladen werden');
    }
    const data = await res.json();
    setGroups(Array.isArray(data.groups) ? data.groups : []);
  }, []);

  const resetForm = useCallback(() => {
    setName('');
    setDescription('');
    setSelectedPermissions([]);
    setIsCreating(false);
    setEditingGroupId(null);
    setShowForm(false);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/permission-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, permissions: selectedPermissions }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Rechtegruppe konnte nicht erstellt werden');
      }

      await refreshGroups();
      resetForm();
      setSuccess('Rechtegruppe wurde erstellt');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroupId) return;
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/permission-groups/${editingGroupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, permissions: selectedPermissions }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Rechtegruppe konnte nicht aktualisiert werden');
      }

      await refreshGroups();
      resetForm();
      setSuccess('Rechtegruppe wurde aktualisiert');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (group: SerializablePermissionGroup) => {
    if (!window.confirm(`Rechtegruppe "${group.name}" wirklich löschen?`)) {
      return;
    }

    setIsDeletingId(group.id);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/permission-groups/${group.id}`, {
        method: 'DELETE',
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? 'Rechtegruppe konnte nicht gelöscht werden');
      }

      await refreshGroups();
      setSuccess('Rechtegruppe wurde gelöscht');
      
      if (editingGroupId === group.id) {
        resetForm();
      }
      if (viewingGroupId === group.id) {
        setViewingGroupId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsDeletingId(null);
    }
  };

  const startEdit = (group: SerializablePermissionGroup) => {
    setEditingGroupId(group.id);
    setIsCreating(false);
    setViewingGroupId(null);
    setShowForm(true);
    setName(group.name);
    setDescription(group.description ?? '');
    setSelectedPermissions(group.permissions);
    setError(null);
    setSuccess(null);
  };

  const startCreate = () => {
    resetForm();
    setIsCreating(true);
    setViewingGroupId(null);
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const toggleCategory = (categoryPermissions: string[]) => {
    const allSelected = categoryPermissions.every((p) =>
      selectedPermissions.includes(p)
    );
    
    if (allSelected) {
      setSelectedPermissions((prev) =>
        prev.filter((p) => !categoryPermissions.includes(p))
      );
    } else {
      setSelectedPermissions((prev) => [
        ...prev,
        ...categoryPermissions.filter((p) => !prev.includes(p)),
      ]);
    }
  };

  const viewingGroup = viewingGroupId
    ? groups.find((g) => g.id === viewingGroupId)
    : null;

  return (
    <div className="space-y-6">
      {/* Feedback Messages */}
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-4 text-green-700">{success}</div>
      )}

      {/* Groups List */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Rechtegruppen</h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (showForm) {
                  setShowForm(false);
                  return;
                }

                if (!isCreating && !editingGroupId) {
                  startCreate();
                  return;
                }

                setShowForm(true);
              }}
              aria-expanded={showForm}
              className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              {showForm ? 'Formular ausblenden' : 'Formular anzeigen'}
            </button>
            <button
              type="button"
              onClick={startCreate}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Neue Rechtegruppe
            </button>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Keine Rechtegruppen vorhanden. Erstellen Sie die erste Rechtegruppe.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {groups.map((group) => (
              <li
                key={group.id}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 hover:bg-gray-50"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900">{group.name}</h3>
                  {group.description && (
                    <p className="mt-1 text-sm text-gray-500">{group.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                    <span>{group.permissions.length} Berechtigungen</span>
                    <span>{group.userCount} Benutzer</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
                  <button
                    onClick={() => setViewingGroupId(group.id)}
                    className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => startEdit(group)}
                    className="rounded px-3 py-1.5 text-sm text-primary-dark hover:bg-primary/10"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => handleDelete(group)}
                    disabled={isDeletingId === group.id}
                    className="rounded px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {isDeletingId === group.id ? 'Löschen...' : 'Löschen'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && (isCreating || editingGroupId) && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {isCreating ? 'Neue Rechtegruppe erstellen' : 'Rechtegruppe bearbeiten'}
          </h2>
          
          <form onSubmit={isCreating ? handleCreate : handleUpdate} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="z.B. Geräte-Verwalter"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Beschreibung
                </label>
                <input
                  type="text"
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Optionale Beschreibung"
                />
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-700">Berechtigungen</h3>
              <div className="space-y-4">
                {PermissionCategories.map((category) => {
                  const categoryPerms = category.permissions.map((p) => p.key);
                  const allSelected = categoryPerms.every((p) =>
                    selectedPermissions.includes(p)
                  );
                  const someSelected = categoryPerms.some((p) =>
                    selectedPermissions.includes(p)
                  );

                  return (
                    <div
                      key={category.name}
                      className="rounded-md border border-gray-200 p-4"
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`cat-${category.name}`}
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someSelected && !allSelected;
                          }}
                          onChange={() => toggleCategory(categoryPerms)}
                          className="h-4 w-4 rounded border-gray-300 text-primary-dark focus:ring-primary"
                        />
                        <label
                          htmlFor={`cat-${category.name}`}
                          className="font-medium text-gray-900"
                        >
                          {category.name}
                        </label>
                      </div>
                      <div className="ml-6 grid gap-2 sm:grid-cols-2">
                        {category.permissions.map((perm) => (
                          <label
                            key={perm.key}
                            className="flex items-center gap-2 text-sm text-gray-600"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(perm.key)}
                              onChange={() => togglePermission(perm.key)}
                              className="h-4 w-4 rounded border-gray-300 text-primary-dark focus:ring-primary"
                            />
                            {perm.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
              >
                {isSubmitting
                  ? 'Speichern...'
                  : isCreating
                  ? 'Erstellen'
                  : 'Speichern'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View Details Modal */}
      {viewingGroup && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Details: {viewingGroup.name}
            </h2>
            <button
              onClick={() => setViewingGroupId(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {viewingGroup.description && (
            <p className="mb-4 text-gray-600">{viewingGroup.description}</p>
          )}

          <div className="mb-6">
            <h3 className="mb-2 text-sm font-medium text-gray-700">
              Berechtigungen ({viewingGroup.permissions.length})
            </h3>
            {viewingGroup.permissions.length === 0 ? (
              <p className="text-sm text-gray-500">Keine Berechtigungen zugewiesen</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {viewingGroup.permissions.map((perm) => {
                  let label = perm;
                  for (const cat of PermissionCategories) {
                    const found = cat.permissions.find((p) => p.key === perm);
                    if (found) {
                      label = found.label;
                      break;
                    }
                  }
                  return (
                    <span
                      key={perm}
                      className="rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary-dark"
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-700">
              Zugewiesene Benutzer ({viewingGroup.userCount})
            </h3>
            <p className="text-sm text-gray-500">
              Benutzer können über die Benutzerverwaltung zu Rechtegruppen hinzugefügt werden.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
