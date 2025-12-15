'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Save, Plus, Trash2, RefreshCw, AlertCircle } from 'lucide-react';

type ProtocolTyp = 'AUSGABE' | 'RUECKGABE' | 'TAUSCH';

type TemplateRow = {
  id?: number;
  titel: string;
  beschreibung: string;
  faelligInTagen: number | null;
  sortierung: number;
  aktiv: boolean;
};

type CurrentUser = {
  id: number;
  email: string;
  name: string;
  role: string;
  permissions: string[];
};

function defaultRowsForTyp(typ: ProtocolTyp): TemplateRow[] {
  if (typ === 'AUSGABE') {
    return [
      { titel: 'User-Account anlegen', beschreibung: 'AD/Email/SSO', faelligInTagen: null, sortierung: 0, aktiv: true },
      { titel: 'Notebook vorbereiten', beschreibung: 'Updates, Basis-Software', faelligInTagen: null, sortierung: 1, aktiv: true },
      { titel: 'Zugänge & Rechte setzen', beschreibung: 'Teams, DMS, Fachanwendungen', faelligInTagen: null, sortierung: 2, aktiv: true },
    ];
  }
  if (typ === 'RUECKGABE') {
    return [
      { titel: 'Geräte zurücknehmen', beschreibung: 'Notebook, Zubehör prüfen', faelligInTagen: null, sortierung: 0, aktiv: true },
      { titel: 'Accounts sperren', beschreibung: 'AD/Email/SSO', faelligInTagen: null, sortierung: 1, aktiv: true },
      { titel: 'Daten sichern/übergeben', beschreibung: 'Projekt- und Personaldaten', faelligInTagen: null, sortierung: 2, aktiv: true },
    ];
  }
  return [
    { titel: 'Altgerät sichern', beschreibung: 'Daten übertragen/Backup', faelligInTagen: null, sortierung: 0, aktiv: true },
    { titel: 'Neues Gerät einrichten', beschreibung: 'Software & Rechte', faelligInTagen: null, sortierung: 1, aktiv: true },
  ];
}

export default function ProtokollAufgabenVorlagenPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [typ, setTyp] = useState<ProtocolTyp>('AUSGABE');
  const [rows, setRows] = useState<TemplateRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canEdit = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.role === 'ADMIN' || currentUser.permissions.includes('protocols:edit');
  }, [currentUser]);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typ]);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/protocol-task-templates?typ=${encodeURIComponent(typ)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Vorlagen konnten nicht geladen werden');
      }
      const data = await res.json();
      const templates = (data.templates as any[]) || [];

      if (templates.length === 0) {
        setRows(defaultRowsForTyp(typ));
      } else {
        setRows(
          templates.map((t, idx) => ({
            id: t.ID,
            titel: t.Titel,
            beschreibung: t.Beschreibung || '',
            faelligInTagen: t.FaelligInTagen ?? null,
            sortierung: t.Sortierung ?? idx,
            aktiv: t.Aktiv !== false,
          }))
        );
      }
    } catch (e: any) {
      setError(e?.message || 'Fehler beim Laden');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplates = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/protocol-task-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typ,
          templates: rows
            .map((r, idx) => ({
              titel: r.titel,
              beschreibung: r.beschreibung,
              faelligInTagen: r.faelligInTagen,
              sortierung: r.sortierung ?? idx,
              aktiv: r.aktiv,
            }))
            .filter((r) => r.titel.trim().length > 0),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Speichern fehlgeschlagen');
      }

      setSuccess('Gespeichert');
      await fetchTemplates();
    } catch (e: any) {
      setError(e?.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  if (currentUser && !currentUser.permissions.includes('protocols:view') && currentUser.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-lg w-full">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <h1 className="font-semibold">Keine Berechtigung</h1>
          </div>
          <p className="text-sm text-gray-600 mt-2">Du darfst diese Seite nicht anzeigen.</p>
          <button
            type="button"
            onClick={() => router.push('/protokolle')}
            className="mt-4 px-4 py-2 rounded-lg bg-primary text-white"
          >
            Zurück
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Aufgaben-Vorlagen</h1>
              <p className="text-xs text-gray-500">Zentraler Punkt für Onboarding/Offboarding-Default-Aufgaben</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchTemplates}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              Neu laden
            </button>
            <button
              type="button"
              onClick={saveTemplates}
              disabled={!canEdit || saving || loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Speichern
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">
        {(error || success) && (
          <div
            className={`border rounded-lg p-3 text-sm ${
              error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            {error || success}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Protokoll-Typ</div>
            <p className="text-xs text-gray-600">Vorlagen werden im Wizard beim Typwechsel automatisch übernommen.</p>
          </div>
          <select
            value={typ}
            onChange={(e) => setTyp(e.target.value as ProtocolTyp)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="AUSGABE">Onboarding (Ausgabe)</option>
            <option value="RUECKGABE">Offboarding (Rückgabe)</option>
            <option value="TAUSCH">Tausch</option>
          </select>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="text-sm font-semibold">Vorlagen</div>
            <button
              type="button"
              disabled={!canEdit}
              onClick={() =>
                setRows((prev) => [
                  ...prev,
                  {
                    titel: 'Neue Aufgabe',
                    beschreibung: '',
                    faelligInTagen: null,
                    sortierung: prev.length,
                    aktiv: true,
                  },
                ])
              }
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Hinzufügen
            </button>
          </div>

          {loading ? (
            <div className="p-4 text-sm text-gray-500">Lade...</div>
          ) : rows.length === 0 ? (
            <div className="p-4 text-sm text-gray-500">Keine Vorlagen.</div>
          ) : (
            <div className="divide-y">
              {rows
                .slice()
                .sort((a, b) => (a.sortierung ?? 0) - (b.sortierung ?? 0))
                .map((row, idx) => (
                  <div key={idx} className="p-4 grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-4">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Titel</label>
                      <input
                        value={row.titel}
                        disabled={!canEdit}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, titel: val } : r)));
                        }}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="md:col-span-4">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Beschreibung</label>
                      <input
                        value={row.beschreibung}
                        disabled={!canEdit}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, beschreibung: val } : r)));
                        }}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Fällig in Tagen</label>
                      <input
                        type="number"
                        value={row.faelligInTagen ?? ''}
                        disabled={!canEdit}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Number(e.target.value);
                          setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, faelligInTagen: val } : r)));
                        }}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      />
                    </div>

                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Aktiv</label>
                      <input
                        type="checkbox"
                        checked={row.aktiv}
                        disabled={!canEdit}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, aktiv: val } : r)));
                        }}
                        className="w-4 h-4"
                      />
                    </div>

                    <div className="md:col-span-1 flex items-end justify-end">
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Entfernen
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500">
          Hinweis: Zum Aktivieren/Deaktivieren reicht das Checkbox-Feld. Sortierung ergibt sich aktuell aus der Reihenfolge.
        </div>
      </main>
    </div>
  );
}
