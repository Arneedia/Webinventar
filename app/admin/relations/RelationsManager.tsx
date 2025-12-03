'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link2, RefreshCw } from 'lucide-react';

interface HsModRelation {
  HSID: number;
  ModID: number;
  HWID: number | null;
  hsName: string | null;
  modName: string | null;
  modellNummer: string | null;
  hwName: string | null;
}

interface AccessoryRelation {
  ID: number;
  BenutzerID: number;
  ZubehoerID: number;
  Start: string;
  Ende: string | null;
  userName: string | null;
  accessoryName: string | null;
}

interface SelectOption {
  id: number;
  name: string;
}

type TabKey = 'HS_MOD' | 'ZB_USER';

const tabs: { key: TabKey; label: string; description: string }[] = [
  {
    key: 'HS_MOD',
    label: 'Hersteller → Modell',
    description: 'Verknüpft Hersteller und Modelle inkl. optionalem Hardware-Typ.',
  },
  {
    key: 'ZB_USER',
    label: 'Zubehör → Benutzer',
    description: 'Verwalte die Tabelle "Zubehör-Benutzer Zuordnung" mit Start- und Enddatum.',
  },
];

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('de-DE');
}

const createAccessoryFormDefaults = () => ({
  BenutzerID: '',
  ZubehoerID: '',
  Start: new Date().toISOString().split('T')[0],
  Ende: '',
});

export default function RelationsManager() {
  const [activeTab, setActiveTab] = useState<TabKey>('HS_MOD');
  const [hsModRelations, setHsModRelations] = useState<HsModRelation[]>([]);
  const [accessoryRelations, setAccessoryRelations] = useState<AccessoryRelation[]>([]);
  const [loadingHsMod, setLoadingHsMod] = useState(true);
  const [loadingAccessory, setLoadingAccessory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [hwOptions, setHwOptions] = useState<SelectOption[]>([]);
  const [hsOptions, setHsOptions] = useState<SelectOption[]>([]);
  const [modOptions, setModOptions] = useState<SelectOption[]>([]);
  const [accessoryOptions, setAccessoryOptions] = useState<SelectOption[]>([]);
  const [userOptions, setUserOptions] = useState<SelectOption[]>([]);

  const [hsModFilterSearch, setHsModFilterSearch] = useState('');
  const [hsModFilterHw, setHsModFilterHw] = useState('');
  const [hsModFilterHs, setHsModFilterHs] = useState('');
  const [accessoryFilterSearch, setAccessoryFilterSearch] = useState('');
  const [accessoryFilterUser, setAccessoryFilterUser] = useState('');
  const [accessoryFilterAccessory, setAccessoryFilterAccessory] = useState('');
  const [accessoryStatusFilter, setAccessoryStatusFilter] = useState<'all' | 'active' | 'returned'>('all');

  const [newHsModRelation, setNewHsModRelation] = useState({ HSID: '', ModID: '', HWID: '' });
  const [creatingHsMod, setCreatingHsMod] = useState(false);
  const [newAccessoryRelation, setNewAccessoryRelation] = useState(createAccessoryFormDefaults());
  const [creatingAccessory, setCreatingAccessory] = useState(false);

  const [editingHsModKey, setEditingHsModKey] = useState<string | null>(null);
  const [editingHwId, setEditingHwId] = useState('');
  const [savingHsModEdit, setSavingHsModEdit] = useState(false);
  const [deletingHsModKey, setDeletingHsModKey] = useState<string | null>(null);

  const [editingAccessoryId, setEditingAccessoryId] = useState<number | null>(null);
  const [editingAccessoryEnd, setEditingAccessoryEnd] = useState('');
  const [savingAccessoryEdit, setSavingAccessoryEdit] = useState(false);
  const [deletingAccessoryId, setDeletingAccessoryId] = useState<number | null>(null);

  const loadHsModRelations = useCallback(async () => {
    try {
      setLoadingHsMod(true);
      const res = await fetch('/api/relations/hs-mod', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Zuordnungen konnten nicht geladen werden');
      }
      setHsModRelations(Array.isArray(data.relations) ? data.relations : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler beim Laden');
      setHsModRelations([]);
    } finally {
      setLoadingHsMod(false);
    }
  }, []);

  const loadAccessoryRelations = useCallback(async () => {
    try {
      setLoadingAccessory(true);
      const res = await fetch('/api/relations/accessory-users', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Zuordnungen konnten nicht geladen werden');
      }
      setAccessoryRelations(Array.isArray(data.relations) ? data.relations : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler beim Laden');
      setAccessoryRelations([]);
    } finally {
      setLoadingAccessory(false);
    }
  }, []);

  const loadOptions = useCallback(async () => {
    const fetchOptions = async (table: string, mapper: (row: any) => SelectOption) => {
      const res = await fetch(`/api/tables/${table}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Fehler beim Laden von ${table}`);
      }
      return (Array.isArray(data.data) ? data.data : []).map(mapper);
    };

    try {
      const [hw, hs, mod, accessories, users] = await Promise.all([
        fetchOptions('HW', (row) => ({ id: row.HWID, name: row.HWName || `HW ${row.HWID}` })),
        fetchOptions('HS', (row) => ({ id: row.HSID, name: row.HSName || `Hersteller ${row.HSID}` })),
        fetchOptions('MOD', (row) => {
          const parts = [row.ModName, row.ModellNummer].filter(Boolean);
          return {
            id: row.ModID,
            name: parts.length > 0 ? parts.join(' · ') : `Modell ${row.ModID}`,
          };
        }),
        fetchOptions('Zubehoer', (row) => ({ id: row.ZubehoerID, name: row.Beschreibung || `Zubehör ${row.ZubehoerID}` })),
        fetchOptions('Benutzer', (row) => ({ id: row.BenutzerID, name: row.BenutzerName || `Benutzer ${row.BenutzerID}` })),
      ]);
      setHwOptions(hw);
      setHsOptions(hs);
      setModOptions(mod);
      setAccessoryOptions(accessories);
      setUserOptions(users);
    } catch (err) {
      console.error(err);
      setError('Konnte Stammdaten nicht laden');
      setHwOptions([]);
      setHsOptions([]);
      setModOptions([]);
      setAccessoryOptions([]);
      setUserOptions([]);
    }
  }, []);

  useEffect(() => {
    loadHsModRelations();
    loadAccessoryRelations();
    loadOptions();
  }, [loadHsModRelations, loadAccessoryRelations, loadOptions]);

  const resetFeedback = () => {
    setError(null);
    setSuccess(null);
  };

  const handleCreateHsMod = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();
    setCreatingHsMod(true);

    try {
      const res = await fetch('/api/relations/hs-mod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHsModRelation),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Zuordnung konnte nicht erstellt werden');
      }
      setNewHsModRelation({ HSID: '', ModID: '', HWID: '' });
      setSuccess('Zuordnung erstellt');
      await loadHsModRelations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler beim Erstellen');
    } finally {
      setCreatingHsMod(false);
    }
  };

  const handleCreateAccessory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();
    setCreatingAccessory(true);

    try {
      const res = await fetch('/api/relations/accessory-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAccessoryRelation),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Zuordnung konnte nicht erstellt werden');
      }
      setNewAccessoryRelation(createAccessoryFormDefaults());
      setSuccess('Zuordnung erstellt');
      await loadAccessoryRelations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler beim Erstellen');
    } finally {
      setCreatingAccessory(false);
    }
  };

  const startHsModEdit = (row: HsModRelation) => {
    setEditingHsModKey(`${row.HSID}-${row.ModID}`);
    setEditingHwId(row.HWID?.toString() ?? '');
    resetFeedback();
  };

  const cancelHsModEdit = () => {
    setEditingHsModKey(null);
    setEditingHwId('');
  };

  const handleSaveHsModEdit = async (row: HsModRelation) => {
    if (!editingHsModKey) return;
    resetFeedback();
    setSavingHsModEdit(true);

    try {
      const res = await fetch(`/api/relations/hs-mod/${row.HSID}/${row.ModID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ HWID: editingHwId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Zuordnung konnte nicht aktualisiert werden');
      }
      setSuccess('Zuordnung aktualisiert');
      cancelHsModEdit();
      await loadHsModRelations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler beim Aktualisieren');
    } finally {
      setSavingHsModEdit(false);
    }
  };

  const handleDeleteHsMod = async (row: HsModRelation) => {
    if (!window.confirm('Zuordnung wirklich löschen?')) return;
    resetFeedback();
    setDeletingHsModKey(`${row.HSID}-${row.ModID}`);

    try {
      const res = await fetch(`/api/relations/hs-mod/${row.HSID}/${row.ModID}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Zuordnung konnte nicht gelöscht werden');
      }
      setSuccess('Zuordnung gelöscht');
      if (editingHsModKey === `${row.HSID}-${row.ModID}`) {
        cancelHsModEdit();
      }
      await loadHsModRelations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler beim Löschen');
    } finally {
      setDeletingHsModKey(null);
    }
  };

  const startAccessoryEdit = (row: AccessoryRelation) => {
    setEditingAccessoryId(row.ID);
    setEditingAccessoryEnd(row.Ende ? row.Ende.split('T')[0] : '');
    resetFeedback();
  };

  const cancelAccessoryEdit = () => {
    setEditingAccessoryId(null);
    setEditingAccessoryEnd('');
  };

  const handleSaveAccessoryEdit = async (row: AccessoryRelation) => {
    if (editingAccessoryId == null) return;
    resetFeedback();
    setSavingAccessoryEdit(true);

    try {
      const res = await fetch(`/api/relations/accessory-users/${row.ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Ende: editingAccessoryEnd }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Zuordnung konnte nicht aktualisiert werden');
      }
      setSuccess('Zuordnung aktualisiert');
      cancelAccessoryEdit();
      await loadAccessoryRelations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler beim Aktualisieren');
    } finally {
      setSavingAccessoryEdit(false);
    }
  };

  const handleDeleteAccessory = async (row: AccessoryRelation) => {
    if (!window.confirm('Zuordnung wirklich löschen?')) return;
    resetFeedback();
    setDeletingAccessoryId(row.ID);

    try {
      const res = await fetch(`/api/relations/accessory-users/${row.ID}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Zuordnung konnte nicht gelöscht werden');
      }
      setSuccess('Zuordnung gelöscht');
      if (editingAccessoryId === row.ID) {
        cancelAccessoryEdit();
      }
      await loadAccessoryRelations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler beim Löschen');
    } finally {
      setDeletingAccessoryId(null);
    }
  };

  const filteredHsModRelations = useMemo(() => {
    return hsModRelations.filter((relation) => {
      if (hsModFilterHw) {
        if (hsModFilterHw === 'none') {
          if (relation.HWID !== null) return false;
        } else if (relation.HWID?.toString() !== hsModFilterHw) {
          return false;
        }
      }

      if (hsModFilterHs && relation.HSID.toString() !== hsModFilterHs) {
        return false;
      }

      if (hsModFilterSearch) {
        const term = hsModFilterSearch.toLowerCase();
        const label = [
          relation.hsName,
          relation.modName,
          relation.modellNummer,
          relation.hwName,
          relation.HSID?.toString(),
          relation.ModID?.toString(),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!label.includes(term)) {
          return false;
        }
      }

      return true;
    });
  }, [hsModRelations, hsModFilterSearch, hsModFilterHw, hsModFilterHs]);

  const filteredAccessoryRelations = useMemo(() => {
    return accessoryRelations.filter((relation) => {
      if (accessoryFilterUser && relation.BenutzerID.toString() !== accessoryFilterUser) {
        return false;
      }
      if (accessoryFilterAccessory && relation.ZubehoerID.toString() !== accessoryFilterAccessory) {
        return false;
      }
      if (accessoryStatusFilter === 'active' && relation.Ende) {
        return false;
      }
      if (accessoryStatusFilter === 'returned' && !relation.Ende) {
        return false;
      }
      if (accessoryFilterSearch) {
        const term = accessoryFilterSearch.toLowerCase();
        const label = [
          relation.userName,
          relation.accessoryName,
          relation.Start,
          relation.Ende ?? '',
          relation.BenutzerID.toString(),
          relation.ZubehoerID.toString(),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!label.includes(term)) {
          return false;
        }
      }
      return true;
    });
  }, [accessoryRelations, accessoryFilterSearch, accessoryFilterUser, accessoryFilterAccessory, accessoryStatusFilter]);

  const editingHsModRow = useMemo(() => {
    if (!editingHsModKey) return null;
    return hsModRelations.find((r) => `${r.HSID}-${r.ModID}` === editingHsModKey) ?? null;
  }, [editingHsModKey, hsModRelations]);

  const currentStats = useMemo(() => {
    if (activeTab === 'HS_MOD') {
      return {
        total: hsModRelations.length,
        filtered: filteredHsModRelations.length,
        loading: loadingHsMod,
      };
    }
    return {
      total: accessoryRelations.length,
      filtered: filteredAccessoryRelations.length,
      loading: loadingAccessory,
    };
  }, [activeTab, hsModRelations.length, filteredHsModRelations.length, loadingHsMod, accessoryRelations.length, filteredAccessoryRelations.length, loadingAccessory]);

  const renderFilterBar = () => {
    if (activeTab === 'HS_MOD') {
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col sm:flex-row gap-3 text-xs">
          <div className="flex-1 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Suchen (Hersteller, Modell, HW)"
              value={hsModFilterSearch}
              onChange={(e) => setHsModFilterSearch(e.target.value)}
              className="w-full sm:flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={hsModFilterHs}
              onChange={(e) => setHsModFilterHs(e.target.value)}
              className="w-full sm:w-48 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle Hersteller</option>
              {hsOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={hsModFilterHw}
              onChange={(e) => setHsModFilterHw(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle Hardware-Typen</option>
              <option value="none">Ohne Hardwarezuordnung</option>
              {hwOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setHsModFilterSearch('');
                setHsModFilterHs('');
                setHsModFilterHw('');
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              Filter zurücksetzen
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col sm:flex-row gap-3 text-xs">
        <div className="flex-1 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Suchen (Benutzer, Zubehör, Datum)"
            value={accessoryFilterSearch}
            onChange={(e) => setAccessoryFilterSearch(e.target.value)}
            className="w-full sm:flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={accessoryFilterUser}
            onChange={(e) => setAccessoryFilterUser(e.target.value)}
            className="w-full sm:w-48 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle Benutzer</option>
            {userOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
          <select
            value={accessoryFilterAccessory}
            onChange={(e) => setAccessoryFilterAccessory(e.target.value)}
            className="w-full sm:w-48 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle Zubehörteile</option>
            {accessoryOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={accessoryStatusFilter}
            onChange={(e) => setAccessoryStatusFilter(e.target.value as 'all' | 'active' | 'returned')}
            className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Alle Status</option>
            <option value="active">Nur aktiv</option>
            <option value="returned">Nur zurückgegeben</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setAccessoryFilterSearch('');
              setAccessoryFilterUser('');
              setAccessoryFilterAccessory('');
              setAccessoryStatusFilter('all');
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Filter zurücksetzen
          </button>
        </div>
      </div>
    );
  };

  const renderCreateForm = () => {
    if (activeTab === 'HS_MOD') {
      return (
        <form className="grid gap-4 md:grid-cols-3" onSubmit={handleCreateHsMod}>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">Hersteller *</span>
            <select
              required
              value={newHsModRelation.HSID}
              onChange={(e) => setNewHsModRelation((prev) => ({ ...prev, HSID: e.target.value }))}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Hersteller wählen</option>
              {hsOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">Modell *</span>
            <select
              required
              value={newHsModRelation.ModID}
              onChange={(e) => setNewHsModRelation((prev) => ({ ...prev, ModID: e.target.value }))}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Modell wählen</option>
              {modOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">Hardware-Typ (optional)</span>
            <select
              value={newHsModRelation.HWID}
              onChange={(e) => setNewHsModRelation((prev) => ({ ...prev, HWID: e.target.value }))}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">— kein Hardware-Typ —</option>
              {hwOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </label>

          <div className="md:col-span-3 flex items-center justify-end gap-3">
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-emerald-600">{success}</p>}
            <button
              type="submit"
              disabled={creatingHsMod}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              <Link2 className="h-4 w-4" />
              {creatingHsMod ? 'Speichert…' : 'Zuordnung erstellen'}
            </button>
          </div>
        </form>
      );
    }

    return (
      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateAccessory}>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">Benutzer *</span>
          <select
            required
            value={newAccessoryRelation.BenutzerID}
            onChange={(e) => setNewAccessoryRelation((prev) => ({ ...prev, BenutzerID: e.target.value }))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Benutzer wählen</option>
            {userOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">Zubehör *</span>
          <select
            required
            value={newAccessoryRelation.ZubehoerID}
            onChange={(e) => setNewAccessoryRelation((prev) => ({ ...prev, ZubehoerID: e.target.value }))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Zubehör wählen</option>
            {accessoryOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">Start *</span>
          <input
            type="date"
            required
            value={newAccessoryRelation.Start}
            onChange={(e) => setNewAccessoryRelation((prev) => ({ ...prev, Start: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">Ende (optional)</span>
          <input
            type="date"
            value={newAccessoryRelation.Ende}
            onChange={(e) => setNewAccessoryRelation((prev) => ({ ...prev, Ende: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </label>

        <div className="md:col-span-2 flex items-center justify-end gap-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}
          <button
            type="submit"
            disabled={creatingAccessory}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            <Link2 className="h-4 w-4" />
            {creatingAccessory ? 'Speichert…' : 'Zuordnung erstellen'}
          </button>
        </div>
      </form>
    );
  };

  const renderTable = () => {
    if (activeTab === 'HS_MOD') {
      if (loadingHsMod) {
        return (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <RefreshCw className="h-5 w-5 animate-spin" />
          </div>
        );
      }

      if (filteredHsModRelations.length === 0) {
        return (
          <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
            Keine Zuordnungen vorhanden.
          </div>
        );
      }

      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Hersteller</th>
                <th className="px-4 py-3">Modell</th>
                <th className="px-4 py-3">Hardware-Typ</th>
                <th className="px-4 py-3 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredHsModRelations.map((row) => {
                const key = `${row.HSID}-${row.ModID}`;
                const isEditing = editingHsModKey === key;
                const isDeleting = deletingHsModKey === key;
                return (
                  <tr key={key} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-gray-900 font-medium">{row.hsName || `Hersteller ${row.HSID}`}</div>
                      <div className="text-xs text-gray-500">ID {row.HSID}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-900 font-medium">{[row.modName, row.modellNummer].filter(Boolean).join(' · ') || `Modell ${row.ModID}`}</div>
                      <div className="text-xs text-gray-500">ModID {row.ModID}</div>
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          value={editingHwId}
                          onChange={(e) => setEditingHwId(e.target.value)}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        >
                          <option value="">— kein Hardware-Typ —</option>
                          {hwOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-gray-900 font-medium">{row.hwName || '— kein HW-Typ verknüpft —'}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <div className="flex flex-wrap justify-end gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => handleSaveHsModEdit(row)}
                            disabled={savingHsModEdit}
                            className="rounded-full bg-emerald-600 px-3 py-1.5 font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300"
                          >
                            {savingHsModEdit ? 'Speichert…' : 'Speichern'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelHsModEdit}
                            className="rounded-full border border-gray-200 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Abbrechen
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap justify-end gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => startHsModEdit(row)}
                            className="rounded-full border border-gray-200 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Bearbeiten
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteHsMod(row)}
                            disabled={isDeleting}
                            className="rounded-full border border-red-200 px-3 py-1.5 font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-red-100 disabled:text-red-300"
                          >
                            {isDeleting ? 'Löscht…' : 'Löschen'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    if (loadingAccessory) {
      return (
        <div className="flex items-center justify-center py-8 text-gray-500">
          <RefreshCw className="h-5 w-5 animate-spin" />
        </div>
      );
    }

    if (filteredAccessoryRelations.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
          Keine Zuordnungen vorhanden.
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Benutzer</th>
              <th className="px-4 py-3">Zubehör</th>
              <th className="px-4 py-3">Zeitraum & Status</th>
              <th className="px-4 py-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredAccessoryRelations.map((row) => {
              const isEditing = editingAccessoryId === row.ID;
              const isDeleting = deletingAccessoryId === row.ID;
              const active = !row.Ende;
              return (
                <tr key={row.ID} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="text-gray-900 font-medium">{row.userName || `Benutzer ${row.BenutzerID}`}</div>
                    <div className="text-xs text-gray-500">ID {row.BenutzerID}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900 font-medium">{row.accessoryName || `Zubehör ${row.ZubehoerID}`}</div>
                    <div className="text-xs text-gray-500">ID {row.ZubehoerID}</div>
                  </td>
                  <td className="px-4 py-3 space-y-1">
                    <div className="text-xs text-gray-500">Start</div>
                    <div className="text-gray-900 font-medium">{formatDate(row.Start)}</div>
                    <div className="text-xs text-gray-500">Ende</div>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editingAccessoryEnd}
                        onChange={(e) => setEditingAccessoryEnd(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    ) : (
                      <div className="text-gray-900 font-medium">{formatDate(row.Ende)}</div>
                    )}
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-0.5 text-[11px] font-medium ${
                        active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {active ? 'Aktiv' : 'Zurückgegeben'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <div className="flex flex-wrap justify-end gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setEditingAccessoryEnd(new Date().toISOString().split('T')[0])}
                          className="rounded-full border border-blue-200 px-3 py-1.5 font-medium text-blue-700 hover:bg-blue-50"
                        >
                          Heute
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveAccessoryEdit(row)}
                          disabled={savingAccessoryEdit}
                          className="rounded-full bg-emerald-600 px-3 py-1.5 font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300"
                        >
                          {savingAccessoryEdit ? 'Speichert…' : 'Speichern'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelAccessoryEdit}
                          className="rounded-full border border-gray-200 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Abbrechen
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap justify-end gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => startAccessoryEdit(row)}
                          className="rounded-full border border-gray-200 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Rückgabe bearbeiten
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAccessory(row)}
                          disabled={isDeleting}
                          className="rounded-full border border-red-200 px-3 py-1.5 font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-red-100 disabled:text-red-300"
                        >
                          {isDeleting ? 'Löscht…' : 'Löschen'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const handleRefresh = () => {
    if (activeTab === 'HS_MOD') {
      loadHsModRelations();
    } else {
      loadAccessoryRelations();
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-2 text-sm">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setActiveTab(tab.key);
              setError(null);
              setSuccess(null);
            }}
            className={`px-4 py-2 rounded-full border text-sm font-medium transition ${
              activeTab === tab.key
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Einträge gesamt</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{currentStats.total}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Gefiltert sichtbar</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{currentStats.filtered}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-sm backdrop-blur space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {tabs.find((t) => t.key === activeTab)?.label}
            </h2>
            <p className="text-sm text-gray-500">{tabs.find((t) => t.key === activeTab)?.description}</p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" /> Neu laden
          </button>
        </div>

        {renderFilterBar()}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-sm backdrop-blur space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Neue Zuordnung anlegen</h2>
        {renderCreateForm()}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-sm backdrop-blur space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Bestehende Zuordnungen</h2>
          <span className="text-xs text-gray-500">{currentStats.filtered} Einträge sichtbar</span>
        </div>
        {renderTable()}
        {activeTab === 'HS_MOD' && editingHsModRow && (
          <p className="text-xs text-gray-500">
            Aktuelle Bearbeitung: Hersteller {editingHsModRow.hsName || editingHsModRow.HSID} · Modell {[editingHsModRow.modName, editingHsModRow.modellNummer].filter(Boolean).join(' · ') || editingHsModRow.ModID}
          </p>
        )}
      </section>
    </div>
  );
}
