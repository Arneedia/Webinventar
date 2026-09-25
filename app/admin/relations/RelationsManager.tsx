'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link2, Plus, RefreshCw, X } from 'lucide-react';
import SearchableSelect from '@/app/components/SearchableSelect';
import SearchableMultiSelect from '@/app/components/SearchableMultiSelect';
import { BEREICHE, BEREICH_LABELS, matchesBereich, type Bereich, type BereichScope } from '@/lib/masterDataBereich';

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
  bereich?: string;
}

interface BueroMasterRow {
  id: number;
  name: string;
  nummer: string | null;
  bereich: Bereich;
}

interface KatHsModRelation {
  KategorieID: number;
  HSID: number;
  ModID: number;
  kategorieName: string;
  hsName: string | null;
  modName: string | null;
  modellNummer: string | null;
}

interface CategoryRow {
  ID: number;
  Name: string;
  Beschreibung: string | null;
  _count?: { Inventar: number };
}

type BueroType = 'hersteller' | 'modell';

type TabKey = 'HS_MOD' | 'ZB_USER' | 'HS_BUERO' | 'MOD_BUERO' | 'KAT_HS_MOD' | 'KAT';

const katKey = (row: { KategorieID: number; HSID: number; ModID: number }) => `${row.KategorieID}-${row.HSID}-${row.ModID}`;

const tabs: { key: TabKey; label: string; description: string }[] = [
  {
    key: 'HS_MOD',
    label: 'Hersteller → Modell',
    description: 'Verknüpft Hersteller und Modelle für die Geräteverwaltung (inkl. optionalem Hardware-Typ) oder das Büroinventar.',
  },
  {
    key: 'ZB_USER',
    label: 'Zubehör → Benutzer',
    description: 'Verwalte die Tabelle "Zubehör-Benutzer Zuordnung" mit Start- und Enddatum.',
  },
  {
    key: 'HS_BUERO',
    label: 'Hersteller',
    description: 'Hersteller anlegen, umbenennen und löschen. Der Bereich legt fest, ob der Hersteller in der Geräteverwaltung, im Büroinventar oder in beiden auswählbar ist. Umbenennungen werden in bestehende Büroinventar-Einträge übernommen.',
  },
  {
    key: 'MOD_BUERO',
    label: 'Modelle',
    description: 'Modelle anlegen, umbenennen und löschen. Der Bereich legt fest, ob das Modell in der Geräteverwaltung, im Büroinventar oder in beiden auswählbar ist. Umbenennungen werden in bestehende Büroinventar-Einträge übernommen.',
  },
  {
    key: 'KAT_HS_MOD',
    label: 'Kategorie → Hersteller/Modell',
    description: 'Verknüpft Büroinventar-Kategorien mit Hersteller-Modell-Zuordnungen. Im Büroinventar werden nach Wahl einer verknüpften Kategorie nur noch die passenden Hersteller und Modelle angeboten.',
  },
  {
    key: 'KAT',
    label: 'Kategorien',
    description: 'Kategorien für das Büroinventar anlegen, umbenennen und löschen. Kategorien mit Inventareinträgen können nicht gelöscht werden.',
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
  const [bueroManufacturers, setBueroManufacturers] = useState<BueroMasterRow[]>([]);
  const [bueroModels, setBueroModels] = useState<BueroMasterRow[]>([]);
  const [bueroUsage, setBueroUsage] = useState<{ hersteller: Record<string, number>; modell: Record<string, number> }>({
    hersteller: {},
    modell: {},
  });
  const [loadingBuero, setLoadingBuero] = useState(true);
  const [bueroSearch, setBueroSearch] = useState('');
  const [bueroUsageFilter, setBueroUsageFilter] = useState<'all' | 'used' | 'unused'>('all');
  const [bueroBereichFilter, setBueroBereichFilter] = useState<Bereich | ''>('');
  const [bueroEditId, setBueroEditId] = useState<number | null>(null);
  const [bueroEditForm, setBueroEditForm] = useState({ name: '', nummer: '', bereich: 'BEIDE' as Bereich });
  const [savingBueroEdit, setSavingBueroEdit] = useState(false);
  const [deletingBueroId, setDeletingBueroId] = useState<number | null>(null);

  const [hsModFilterSearch, setHsModFilterSearch] = useState('');
  const [hsModFilterHw, setHsModFilterHw] = useState('');
  const [hsModFilterHs, setHsModFilterHs] = useState('');
  const [accessoryFilterSearch, setAccessoryFilterSearch] = useState('');
  const [accessoryFilterUser, setAccessoryFilterUser] = useState('');
  const [accessoryFilterAccessory, setAccessoryFilterAccessory] = useState('');
  const [accessoryStatusFilter, setAccessoryStatusFilter] = useState<'all' | 'active' | 'returned'>('all');

  const [newHsModRelation, setNewHsModRelation] = useState({ HSID: '', ModIDs: [] as (string | number)[], HWID: '', Bereich: 'GERAETE' as BereichScope });
  const [creatingHsMod, setCreatingHsMod] = useState(false);
  const [newBueroItem, setNewBueroItem] = useState({ name: '', nummer: '', bereich: 'BEIDE' as Bereich });
  const [creatingBueroItem, setCreatingBueroItem] = useState(false);
  const [newAccessoryRelation, setNewAccessoryRelation] = useState(createAccessoryFormDefaults());
  const [creatingAccessory, setCreatingAccessory] = useState(false);

  const [katRelations, setKatRelations] = useState<KatHsModRelation[]>([]);
  const [loadingKat, setLoadingKat] = useState(true);
  const [katFilterSearch, setKatFilterSearch] = useState('');
  const [katFilterKategorie, setKatFilterKategorie] = useState('');
  const [newKatRelation, setNewKatRelation] = useState({ KategorieID: '', pairKeys: [] as (string | number)[] });
  const [creatingKat, setCreatingKat] = useState(false);
  const [deletingKatKey, setDeletingKatKey] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categorySearch, setCategorySearch] = useState('');
  const [newCategory, setNewCategory] = useState({ name: '', beschreibung: '' });
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryEditId, setCategoryEditId] = useState<number | null>(null);
  const [categoryEditForm, setCategoryEditForm] = useState({ name: '', beschreibung: '' });
  const [savingCategoryEdit, setSavingCategoryEdit] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);

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
        fetchOptions('HS', (row) => ({ id: row.HSID, name: row.HSName || `Hersteller ${row.HSID}`, bereich: row.Bereich })),
        fetchOptions('MOD', (row) => {
          const parts = [row.ModName, row.ModellNummer].filter(Boolean);
          return {
            id: row.ModID,
            name: parts.length > 0 ? parts.join(' · ') : `Modell ${row.ModID}`,
            bereich: row.Bereich,
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

  const loadBueroMasterData = useCallback(async () => {
    try {
      setLoadingBuero(true);
      const [hsRes, modRes, itemsRes] = await Promise.all([
        fetch('/api/tables/HS', { cache: 'no-store' }),
        fetch('/api/tables/MOD', { cache: 'no-store' }),
        fetch('/api/office-inventory', { cache: 'no-store' }),
      ]);
      if (!hsRes.ok || !modRes.ok) throw new Error('Hersteller/Modelle konnten nicht geladen werden');
      const [hsData, modData] = await Promise.all([hsRes.json(), modRes.json()]);
      const byName = (a: BueroMasterRow, b: BueroMasterRow) => a.name.localeCompare(b.name, 'de');
      setBueroManufacturers(
        (hsData.data ?? [])
          .map((row: any) => ({ id: row.HSID, name: row.HSName || `Hersteller ${row.HSID}`, nummer: null, bereich: row.Bereich ?? 'BEIDE' }))
          .sort(byName)
      );
      setBueroModels(
        (modData.data ?? [])
          .map((row: any) => ({
            id: row.ModID,
            name: row.ModName || `Modell ${row.ModID}`,
            nummer: row.ModellNummer ?? null,
            bereich: row.Bereich ?? 'BEIDE',
          }))
          .sort(byName)
      );

      const usage = { hersteller: {} as Record<string, number>, modell: {} as Record<string, number> };
      if (itemsRes.ok) {
        for (const item of (await itemsRes.json()) as { hersteller: string | null; modell: string | null }[]) {
          if (item.hersteller) {
            const key = item.hersteller.trim().toLowerCase();
            usage.hersteller[key] = (usage.hersteller[key] ?? 0) + 1;
          }
          if (item.modell) {
            const key = item.modell.trim().toLowerCase();
            usage.modell[key] = (usage.modell[key] ?? 0) + 1;
          }
        }
      }
      setBueroUsage(usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hersteller/Modelle konnten nicht geladen werden');
    } finally {
      setLoadingBuero(false);
    }
  }, []);

  const loadKatRelations = useCallback(async () => {
    try {
      setLoadingKat(true);
      const res = await fetch('/api/relations/kat-hs-mod', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Kategorie-Zuordnungen konnten nicht geladen werden');
      setKatRelations(Array.isArray(data.relations) ? data.relations : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kategorie-Zuordnungen konnten nicht geladen werden');
      setKatRelations([]);
    } finally {
      setLoadingKat(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      setLoadingCategories(true);
      const res = await fetch('/api/office-categories', { cache: 'no-store' });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data.error || 'Kategorien konnten nicht geladen werden');
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kategorien konnten nicht geladen werden');
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    loadHsModRelations();
    loadAccessoryRelations();
    loadOptions();
    loadBueroMasterData();
    loadKatRelations();
    loadCategories();
  }, [loadHsModRelations, loadAccessoryRelations, loadOptions, loadBueroMasterData, loadKatRelations, loadCategories]);

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

    setCreatingHsMod(true);
    const errors: string[] = [];
    let created = 0;

    for (const modId of ModIDs) {
      try {
        const res = await fetch('/api/relations/hs-mod', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ HSID, ModID: String(modId), HWID: Bereich === 'GERAETE' ? HWID : '' }),
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
      setNewHsModRelation((prev) => ({ HSID: '', ModIDs: [], HWID: '', Bereich: prev.Bereich }));
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

  const bueroType: BueroType = activeTab === 'MOD_BUERO' ? 'modell' : 'hersteller';
  const bueroLabel = bueroType === 'modell' ? 'Modell' : 'Hersteller';

  const relationCounts = useMemo(() => {
    const hersteller: Record<number, number> = {};
    const modell: Record<number, number> = {};
    for (const relation of hsModRelations) {
      hersteller[relation.HSID] = (hersteller[relation.HSID] ?? 0) + 1;
      modell[relation.ModID] = (modell[relation.ModID] ?? 0) + 1;
    }
    return { hersteller, modell };
  }, [hsModRelations]);

  const bueroRows = bueroType === 'modell' ? bueroModels : bueroManufacturers;
  const bueroItemCount = (row: BueroMasterRow) => bueroUsage[bueroType][row.name.trim().toLowerCase()] ?? 0;
  const bueroRelationCount = (row: BueroMasterRow) => relationCounts[bueroType][row.id] ?? 0;

  const filteredBueroRows = useMemo(() => {
    const term = bueroSearch.trim().toLowerCase();
    return bueroRows.filter((row) => {
      if (term && ![row.name, row.nummer, String(row.id)].some((v) => v?.toLowerCase().includes(term))) return false;
      const used = (bueroUsage[bueroType][row.name.trim().toLowerCase()] ?? 0) > 0;
      if (bueroUsageFilter === 'used' && !used) return false;
      if (bueroUsageFilter === 'unused' && used) return false;
      if (bueroBereichFilter && row.bereich !== bueroBereichFilter) return false;
      return true;
    });
  }, [bueroRows, bueroSearch, bueroUsageFilter, bueroBereichFilter, bueroUsage, bueroType]);

  const hsModScopedHsOptions = useMemo(
    () => hsOptions.filter((opt) => matchesBereich(opt.bereich, newHsModRelation.Bereich)),
    [hsOptions, newHsModRelation.Bereich]
  );
  const hsModScopedModOptions = useMemo(
    () => modOptions.filter((opt) => matchesBereich(opt.bereich, newHsModRelation.Bereich)),
    [modOptions, newHsModRelation.Bereich]
  );

  const handleCreateBuero = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();
    setCreatingBueroItem(true);
    try {
      const res = await fetch(`/api/office-master-data/${bueroType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBueroItem),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `${bueroLabel} konnte nicht angelegt werden`);
      setNewBueroItem((prev) => ({ name: '', nummer: '', bereich: prev.bereich }));
      setSuccess(`${bueroLabel} „${newBueroItem.name.trim()}“ angelegt`);
      await Promise.all([loadBueroMasterData(), loadOptions()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler beim Anlegen');
    } finally {
      setCreatingBueroItem(false);
    }
  };

  const startBueroEdit = (row: BueroMasterRow) => {
    setBueroEditId(row.id);
    setBueroEditForm({ name: row.name, nummer: row.nummer ?? '', bereich: row.bereich });
    resetFeedback();
  };

  const cancelBueroEdit = () => {
    setBueroEditId(null);
    setBueroEditForm({ name: '', nummer: '', bereich: 'BEIDE' });
  };

  const handleSaveBueroEdit = async (row: BueroMasterRow) => {
    resetFeedback();
    setSavingBueroEdit(true);
    try {
      const res = await fetch(`/api/office-master-data/${bueroType}/${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bueroEditForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `${bueroLabel} konnte nicht gespeichert werden`);
      setSuccess(
        data.updatedItems
          ? `${bueroLabel} gespeichert, ${data.updatedItems} Büroinventar-Eintrag/Einträge aktualisiert`
          : `${bueroLabel} gespeichert`
      );
      cancelBueroEdit();
      await Promise.all([loadBueroMasterData(), loadOptions(), loadHsModRelations()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler beim Speichern');
    } finally {
      setSavingBueroEdit(false);
    }
  };

  const handleDeleteBuero = async (row: BueroMasterRow) => {
    if (!window.confirm(`${bueroLabel} „${row.name}“ wirklich löschen?`)) return;
    resetFeedback();
    setDeletingBueroId(row.id);
    try {
      const res = await fetch(`/api/office-master-data/${bueroType}/${row.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `${bueroLabel} konnte nicht gelöscht werden`);
      setSuccess(`${bueroLabel} „${row.name}“ gelöscht`);
      if (bueroEditId === row.id) cancelBueroEdit();
      await Promise.all([loadBueroMasterData(), loadOptions()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler beim Löschen');
    } finally {
      setDeletingBueroId(null);
    }
  };

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
    if (activeTab === 'HS_BUERO' || activeTab === 'MOD_BUERO') {
      return {
        total: bueroRows.length,
        filtered: filteredBueroRows.length,
        loading: loadingBuero,
      };
    }
    return {
      total: accessoryRelations.length,
      filtered: filteredAccessoryRelations.length,
      loading: loadingAccessory,
    };
  }, [activeTab, hsModRelations.length, filteredHsModRelations.length, loadingHsMod, accessoryRelations.length, filteredAccessoryRelations.length, loadingAccessory, bueroRows.length, filteredBueroRows.length, loadingBuero]);

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

    if (activeTab === 'HS_BUERO' || activeTab === 'MOD_BUERO') {
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col sm:flex-row gap-3 text-xs">
          <div className="flex-1 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder={bueroType === 'modell' ? 'Suchen (Modell, Modellnummer, ID)' : 'Suchen (Hersteller, ID)'}
              value={bueroSearch}
              onChange={(e) => setBueroSearch(e.target.value)}
              className="w-full sm:flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={bueroUsageFilter}
              onChange={(e) => setBueroUsageFilter(e.target.value as 'all' | 'used' | 'unused')}
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">Alle</option>
              <option value="used">Im Büroinventar verwendet</option>
              <option value="unused">Nicht im Büroinventar verwendet</option>
            </select>
            <select
              value={bueroBereichFilter}
              onChange={(e) => setBueroBereichFilter(e.target.value as Bereich | '')}
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Alle Bereiche</option>
              {BEREICHE.map((value) => (
                <option key={value} value={value}>
                  {BEREICH_LABELS[value]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setBueroSearch('');
                setBueroUsageFilter('all');
                setBueroBereichFilter('');
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
          <div className="md:col-span-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-600">Bereich *</span>
              <select
                value={newHsModRelation.Bereich}
                onChange={(e) =>
                  setNewHsModRelation({ HSID: '', ModIDs: [], HWID: '', Bereich: e.target.value as BereichScope })
                }
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="GERAETE">{BEREICH_LABELS.GERAETE}</option>
                <option value="BUERO">{BEREICH_LABELS.BUERO}</option>
              </select>
              <span className="text-xs text-gray-400">Es werden nur Hersteller und Modelle dieses Bereichs angeboten.</span>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">Hersteller *</span>
            <SearchableSelect
              options={hsModScopedHsOptions.map(opt => ({ value: opt.id, label: opt.name }))}
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
              options={hsModScopedModOptions.map(opt => ({ value: opt.id, label: opt.name }))}
              selectedValues={newHsModRelation.ModIDs}
              onChange={(values) => setNewHsModRelation((prev) => ({ ...prev, ModIDs: values }))}
              placeholder="Keine Modelle gefunden"
              searchPlaceholder="Modell suchen..."
            />
          </div>

          {newHsModRelation.Bereich === 'GERAETE' && (
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
          )}

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

    if (activeTab === 'HS_BUERO' || activeTab === 'MOD_BUERO') {
      return (
        <form className={`grid gap-4 ${bueroType === 'modell' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`} onSubmit={handleCreateBuero}>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">{bueroLabel} *</span>
            <input
              type="text"
              required
              autoFocus
              value={newBueroItem.name}
              onChange={(e) => setNewBueroItem((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={bueroType === 'modell' ? 'z.B. BEKANT' : 'z.B. Steelcase'}
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
            />
          </label>
          {bueroType === 'modell' && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-gray-600">Modellnummer (optional)</span>
              <input
                type="text"
                value={newBueroItem.nummer}
                onChange={(e) => setNewBueroItem((prev) => ({ ...prev, nummer: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
              />
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">Bereich *</span>
            <select
              value={newBueroItem.bereich}
              onChange={(e) => setNewBueroItem((prev) => ({ ...prev, bereich: e.target.value as Bereich }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
            >
              {BEREICHE.map((value) => (
                <option key={value} value={value}>
                  {BEREICH_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <div className={`${bueroType === 'modell' ? 'md:col-span-3' : 'md:col-span-2'} flex items-center justify-end gap-3`}>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-emerald-600">{success}</p>}
            <button
              type="submit"
              disabled={creatingBueroItem}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {creatingBueroItem ? 'Speichert…' : `${bueroLabel} anlegen`}
            </button>
          </div>
        </form>
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
    if (activeTab === 'HS_BUERO' || activeTab === 'MOD_BUERO') {
      if (loadingBuero) {
        return (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <RefreshCw className="h-5 w-5 animate-spin" />
          </div>
        );
      }

      if (filteredBueroRows.length === 0) {
        return (
          <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
            {bueroType === 'modell' ? 'Keine Modelle vorhanden.' : 'Keine Hersteller vorhanden.'}
          </div>
        );
      }

      const inputClass =
        'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-500 focus:outline-none';

      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">{bueroLabel}</th>
                {bueroType === 'modell' && <th className="px-4 py-3">Modellnummer</th>}
                <th className="px-4 py-3">Bereich</th>
                <th className="px-4 py-3">Verwendung</th>
                <th className="px-4 py-3 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBueroRows.map((row) => {
                const isEditing = bueroEditId === row.id;
                const isDeleting = deletingBueroId === row.id;
                const itemCount = bueroItemCount(row);
                const relationCount = bueroRelationCount(row);
                return (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={bueroEditForm.name}
                          onChange={(e) => setBueroEditForm((prev) => ({ ...prev, name: e.target.value }))}
                          className={inputClass}
                          autoFocus
                        />
                      ) : (
                        <>
                          <div className="text-gray-900 font-medium">{row.name}</div>
                          <div className="text-xs text-gray-500">ID {row.id}</div>
                        </>
                      )}
                    </td>
                    {bueroType === 'modell' && (
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={bueroEditForm.nummer}
                            onChange={(e) => setBueroEditForm((prev) => ({ ...prev, nummer: e.target.value }))}
                            className={inputClass}
                          />
                        ) : (
                          <div className="text-gray-900">{row.nummer || '—'}</div>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          value={bueroEditForm.bereich}
                          onChange={(e) => setBueroEditForm((prev) => ({ ...prev, bereich: e.target.value as Bereich }))}
                          className={inputClass}
                        >
                          {BEREICHE.map((value) => (
                            <option key={value} value={value}>
                              {BEREICH_LABELS[value]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            row.bereich === 'GERAETE'
                              ? 'bg-indigo-50 text-indigo-700'
                              : row.bereich === 'BUERO'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {BEREICH_LABELS[row.bereich] ?? row.bereich}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5 text-xs">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                            itemCount ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {itemCount} Büroinventar
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                            relationCount ? 'bg-sky-50 text-sky-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {relationCount} Zuordnung{relationCount === 1 ? '' : 'en'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <div className="flex flex-wrap justify-end gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => handleSaveBueroEdit(row)}
                            disabled={savingBueroEdit || !bueroEditForm.name.trim()}
                            className="rounded-full bg-emerald-600 px-3 py-1.5 font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300"
                          >
                            {savingBueroEdit ? 'Speichert…' : 'Speichern'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelBueroEdit}
                            className="rounded-full border border-gray-200 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Abbrechen
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap justify-end gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => startBueroEdit(row)}
                            className="rounded-full border border-gray-200 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Bearbeiten
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBuero(row)}
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
    } else if (activeTab === 'HS_BUERO' || activeTab === 'MOD_BUERO') {
      loadBueroMasterData();
      loadHsModRelations();
    } else {
      loadAccessoryRelations();
    }
  };

  const isBueroTab = activeTab === 'HS_BUERO' || activeTab === 'MOD_BUERO';
  const createLabel = isBueroTab ? (bueroType === 'modell' ? 'Neues Modell anlegen' : 'Neuen Hersteller anlegen') : 'Neue Zuordnung anlegen';

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
              cancelBueroEdit();
              setNewBueroItem({ name: '', nummer: '', bereich: 'BEIDE' });
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
              <Plus className="h-4 w-4" /> {createLabel}
            </button>
          </div>
        </div>

        {renderFilterBar()}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {isBueroTab ? (bueroType === 'modell' ? 'Bestehende Modelle' : 'Bestehende Hersteller') : 'Bestehende Zuordnungen'}
          </h2>
          <span className="text-xs text-gray-500">{currentStats.filtered} Einträge sichtbar</span>
        </div>
        {isBueroTab && !isCreateModalOpen && (error || success) && (
          <p className={`text-sm ${error ? 'text-red-600' : 'text-emerald-600'}`}>{error || success}</p>
        )}
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
                <h2 className="text-lg font-semibold text-gray-900">{createLabel}</h2>
                <p className="text-sm text-gray-500">
                  {isBueroTab
                    ? `${bueroType === 'modell' ? 'Das Modell' : 'Der Hersteller'} steht danach sofort im Büroinventar zur Auswahl.`
                    : 'Die Zuordnung wird nach dem Speichern direkt in der Liste sichtbar.'}
                </p>
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
