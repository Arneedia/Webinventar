'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link2, Plus, RefreshCw, X } from 'lucide-react';
import SearchableSelect from '@/app/components/SearchableSelect';
import SearchableMultiSelect from '@/app/components/SearchableMultiSelect';

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

type TabKey = 'HS_MOD' | 'ZB_USER' | 'HS_BUERO' | 'MOD_BUERO';

const tabs: { key: TabKey; label: string; description: string }[] = [
  {
    key: 'HS_MOD',
    label: 'Hersteller → Modell (Geräte)',
    description: 'Verknüpft Hersteller und Modelle für die Geräteverwaltung inkl. optionalem Hardware-Typ.',
  },
  {
    key: 'ZB_USER',
    label: 'Zubehör → Benutzer',
    description: 'Verwalte die Tabelle "Zubehör-Benutzer Zuordnung" mit Start- und Enddatum.',
  },
  {
    key: 'HS_BUERO',
    label: 'Hersteller (Büroinventar)',
    description: 'Verwalte Hersteller für das Büroinventar.',
  },
  {
    key: 'MOD_BUERO',
    label: 'Modelle (Büroinventar)',
    description: 'Verwalte Modelle für das Büroinventar.',
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
  const [bueroHsOptions, setBueroHsOptions] = useState<SelectOption[]>([]);
  const [bueroModOptions, setBueroModOptions] = useState<SelectOption[]>([]);

  const [hsModFilterSearch, setHsModFilterSearch] = useState('');
  const [hsModFilterHw, setHsModFilterHw] = useState('');
  const [hsModFilterHs, setHsModFilterHs] = useState('');
  const [accessoryFilterSearch, setAccessoryFilterSearch] = useState('');
  const [accessoryFilterUser, setAccessoryFilterUser] = useState('');
  const [accessoryFilterAccessory, setAccessoryFilterAccessory] = useState('');
  const [accessoryStatusFilter, setAccessoryStatusFilter] = useState<'all' | 'active' | 'returned'>('all');

  const [newHsModRelation, setNewHsModRelation] = useState({ HSID: '', ModIDs: [] as (string | number)[], HWID: '', Bereich: 'GERAETE' as 'GERAETE' | 'BUERO' });
  const [creatingHsMod, setCreatingHsMod] = useState(false);
  const [newBueroHs, setNewBueroHs] = useState({ Name: '' });
  const [newBueroMod, setNewBueroMod] = useState({ Name: '', Nummer: '' });
  const [creatingBueroItem, setCreatingBueroItem] = useState(false);
  const [newAccessoryRelation, setNewAccessoryRelation] = useState(createAccessoryFormDefaults());
  const [creatingAccessory, setCreatingAccessory] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
      const data = await res.json().catch(async () => {
        const text = await res.text();
        throw new Error(text ? `Antwort ist kein JSON: ${text.slice(0, 120)}` : 'Antwort ist kein JSON');
      });
      if (!res.ok) {
        throw new Error(data?.error || 'Zuordnungen konnten nicht geladen werden');
      }
      setHsModRelations(Array.isArray(data?.relations) ? data.relations : []);
      setError(null);
    } catch (err) {
      console.error('loadHsModRelations failed', err);
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
      setHwOptions(hw.sort((a: SelectOption, b: SelectOption) => a.name.localeCompare(b.name, 'de')));
      setHsOptions(hs.sort((a: SelectOption, b: SelectOption) => a.name.localeCompare(b.name, 'de')));
      setModOptions(mod.sort((a: SelectOption, b: SelectOption) => a.name.localeCompare(b.name, 'de')));
      setAccessoryOptions(accessories.sort((a: SelectOption, b: SelectOption) => a.name.localeCompare(b.name, 'de')));
      setUserOptions(users.sort((a: SelectOption, b: SelectOption) => a.name.localeCompare(b.name, 'de')));
      
      // Kopiere für Büroinventar (später können separate Tabellen verwendet werden)
      setBueroHsOptions(hs.sort((a: SelectOption, b: SelectOption) => a.name.localeCompare(b.name, 'de')));
      setBueroModOptions(mod.sort((a: SelectOption, b: SelectOption) => a.name.localeCompare(b.name, 'de')));
    } catch (err) {
      console.error(err);
      setError('Konnte Stammdaten nicht laden');
      setHwOptions([]);
      setHsOptions([]);
      setModOptions([]);
      setAccessoryOptions([]);
      setUserOptions([]);
      setBueroHsOptions([]);
      setBueroModOptions([]);
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

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    resetFeedback();
  };

  const openCreateModal = () => {
    resetFeedback();
    setIsCreateModalOpen(true);
  };

  const handleCreateHsMod = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();

    const { HSID, ModIDs, HWID, Bereich } = newHsModRelation;
    if (!HSID || ModIDs.length === 0) {
      setError('Bitte Hersteller und mindestens ein Modell auswählen.');
      return;
    }
    
    if (Bereich === 'BUERO') {
      setError('Büroinventar-Zuordnungen werden direkt beim Anlegen von Inventargegenständen erstellt.');
      return;
    }

    setCreatingHsMod(true);
    const errors: string[] = [];
    let created = 0;

    for (const modId of ModIDs) {
      try {
        const res = await fetch('/api/relations/hs-mod', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ HSID, ModID: String(modId), HWID }),
        });
        const data = await res.json();
        if (!res.ok) {
          const modLabel = modOptions.find((m) => m.id === Number(modId))?.name ?? `Modell ${modId}`;
          errors.push(`${modLabel}: ${data.error || 'Fehler'}`);
        } else {
          created++;
        }
      } catch {
        errors.push(`Modell ${modId}: Netzwerkfehler`);
      }
    }

    if (created > 0) {
      setSuccess(`${created} Zuordnung${created > 1 ? 'en' : ''} erstellt`);
      setNewHsModRelation({ HSID: '', ModIDs: [], HWID: '', Bereich: 'GERAETE' });
    }
    if (errors.length > 0) {
      setError(errors.join(' | '));
    }

    await loadHsModRelations();
    setCreatingHsMod(false);
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
    if (activeTab === 'HS_BUERO') {
      return {
        total: bueroHsOptions.length,
        filtered: bueroHsOptions.length,
        loading: false,
      };
    }
    if (activeTab === 'MOD_BUERO') {
      return {
        total: bueroModOptions.length,
        filtered: bueroModOptions.length,
        loading: false,
      };
    }
    return {
      total: accessoryRelations.length,
      filtered: filteredAccessoryRelations.length,
      loading: loadingAccessory,
    };
  }, [activeTab, hsModRelations.length, filteredHsModRelations.length, loadingHsMod, accessoryRelations.length, filteredAccessoryRelations.length, loadingAccessory, bueroHsOptions.length, bueroModOptions.length]);

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
              className="w-full sm:flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              value={hsModFilterHs}
              onChange={(e) => setHsModFilterHs(e.target.value)}
              className="w-full sm:w-48 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            className="w-full sm:flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select
            value={accessoryFilterUser}
            onChange={(e) => setAccessoryFilterUser(e.target.value)}
            className="w-full sm:w-48 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            className="w-full sm:w-48 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            <SearchableSelect
              options={hsOptions.map(opt => ({ value: opt.id, label: opt.name }))}
              value={newHsModRelation.HSID}
              onChange={(value) => setNewHsModRelation((prev) => ({ ...prev, HSID: value }))}
              placeholder="Hersteller wählen"
              searchPlaceholder="Hersteller suchen..."
              required
            />
          </label>

          <div className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">Modelle * <span className="text-xs text-gray-400">(Mehrfachauswahl)</span></span>
            <SearchableMultiSelect
              options={modOptions.map(opt => ({ value: opt.id, label: opt.name }))}
              selectedValues={newHsModRelation.ModIDs}
              onChange={(values) => setNewHsModRelation((prev) => ({ ...prev, ModIDs: values }))}
              placeholder="Keine Modelle gefunden"
              searchPlaceholder="Modell suchen..."
            />
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">Hardware-Typ (optional)</span>
            <SearchableSelect
              options={hwOptions.map(opt => ({ value: opt.id, label: opt.name }))}
              value={newHsModRelation.HWID}
              onChange={(value) => setNewHsModRelation((prev) => ({ ...prev, HWID: value }))}
              placeholder="— kein Hardware-Typ —"
              searchPlaceholder="Hardware-Typ suchen..."
            />
          </label>

          <div className="md:col-span-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-600">Bereich *</span>
              <select
                value={newHsModRelation.Bereich}
                onChange={(e) => setNewHsModRelation((prev) => ({ ...prev, Bereich: e.target.value as 'GERAETE' | 'BUERO' }))}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="GERAETE">Geräteverwaltung</option>
                <option value="BUERO">Büroinventar</option>
              </select>
            </label>
          </div>

          <div className="md:col-span-3 flex items-center justify-end gap-3">
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-emerald-600">{success}</p>}
            <button
              type="submit"
              disabled={creatingHsMod}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Link2 className="h-4 w-4" />
              {creatingHsMod ? 'Speichert…' : 'Zuordnung erstellen'}
            </button>
          </div>
        </form>
      );
    }

    if (activeTab === 'HS_BUERO') {
      return (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Hersteller für das Büroinventar werden direkt in der Stammdatenverwaltung (HS-Tabelle) angelegt.
            Diese Liste zeigt alle verfügbaren Hersteller.
          </p>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="font-medium text-gray-900 mb-2">Verfügbare Hersteller ({bueroHsOptions.length})</h3>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {bueroHsOptions.map(opt => (
                <div key={opt.id} className="text-sm text-gray-700 px-2 py-1 hover:bg-white rounded">
                  {opt.name} <span className="text-gray-400">(ID: {opt.id})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'MOD_BUERO') {
      return (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Modelle für das Büroinventar werden direkt in der Stammdatenverwaltung (MOD-Tabelle) angelegt.
            Diese Liste zeigt alle verfügbaren Modelle.
          </p>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="font-medium text-gray-900 mb-2">Verfügbare Modelle ({bueroModOptions.length})</h3>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {bueroModOptions.map(opt => (
                <div key={opt.id} className="text-sm text-gray-700 px-2 py-1 hover:bg-white rounded">
                  {opt.name} <span className="text-gray-400">(ID: {opt.id})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateAccessory}>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">Benutzer *</span>
          <SearchableSelect
            options={userOptions.map(opt => ({ value: opt.id, label: opt.name }))}
            value={newAccessoryRelation.BenutzerID}
            onChange={(value) => setNewAccessoryRelation((prev) => ({ ...prev, BenutzerID: value }))}
            placeholder="Benutzer wählen"
            searchPlaceholder="Benutzer suchen..."
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">Zubehör *</span>
          <SearchableSelect
            options={accessoryOptions.map(opt => ({ value: opt.id, label: opt.name }))}
            value={newAccessoryRelation.ZubehoerID}
            onChange={(value) => setNewAccessoryRelation((prev) => ({ ...prev, ZubehoerID: value }))}
            placeholder="Zubehör wählen"
            searchPlaceholder="Zubehör suchen..."
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">Start *</span>
          <input
            type="date"
            required
            value={newAccessoryRelation.Start}
            onChange={(e) => setNewAccessoryRelation((prev) => ({ ...prev, Start: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">Ende (optional)</span>
          <input
            type="date"
            value={newAccessoryRelation.Ende}
            onChange={(e) => setNewAccessoryRelation((prev) => ({ ...prev, Ende: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
          />
        </label>

        <div className="md:col-span-2 flex items-center justify-end gap-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}
          <button
            type="submit"
            disabled={creatingAccessory}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Link2 className="h-4 w-4" />
            {creatingAccessory ? 'Speichert…' : 'Zuordnung erstellen'}
          </button>
        </div>
      </form>
    );
  };

  const renderTable = () => {
    if (activeTab === 'HS_BUERO') {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Hersteller</th>
                <th className="px-4 py-3">Verwendung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bueroHsOptions.map((opt) => (
                <tr key={opt.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{opt.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{opt.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">Geräte & Büroinventar</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (activeTab === 'MOD_BUERO') {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Modell</th>
                <th className="px-4 py-3">Verwendung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bueroModOptions.map((opt) => (
                <tr key={opt.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{opt.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{opt.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">Geräte & Büroinventar</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

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
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
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
                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
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
                          className="rounded-full border border-primary/30 px-3 py-1.5 font-medium text-primary-dark hover:bg-primary/10"
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
              setIsCreateModalOpen(false);
              setError(null);
              setSuccess(null);
            }}
            className={`px-4 py-2 rounded-full border text-sm font-medium transition ${
              activeTab === tab.key
                ? 'border-gray-900 text-gray-900 bg-gray-100'
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

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {tabs.find((t) => t.key === activeTab)?.label}
            </h2>
            <p className="text-sm text-gray-500">{tabs.find((t) => t.key === activeTab)?.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" /> Neu laden
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
            >
              <Plus className="h-4 w-4" /> Neue Zuordnung anlegen
            </button>
          </div>
        </div>

        {renderFilterBar()}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
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

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Schließen"
            onClick={closeCreateModal}
            className="absolute inset-0 bg-black/40"
          />
          <div className="relative w-full max-w-4xl rounded-xl border border-gray-200 bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-gray-900">Neue Zuordnung anlegen</h2>
                <p className="text-sm text-gray-500">Die Zuordnung wird nach dem Speichern direkt in der Liste sichtbar.</p>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                className="inline-flex items-center justify-center rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5">
              {renderCreateForm()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
