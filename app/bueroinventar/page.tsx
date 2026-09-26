'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Package,
  Plus,
  RefreshCw,
  Edit2,
  Archive,
  MapPin,
  UserRound,
  History,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronRight,
  X,
} from 'lucide-react';
import RoomUserSelects from '../components/RoomUserSelects';
import SearchableSelect from '../components/SearchableSelect';
import SearchableSelectWithCustom from '../components/SearchableSelectWithCustom';
import { filterOfficeSelectOptions, type KatHsModPair } from '@/lib/officeOptions';

interface OfficeItem {
  id: number;
  kategorieId: number;
  kategorieName: string;
  bezeichnung: string;
  beschreibung: string | null;
  inventarNr: string | null;
  seriennummer: string | null;
  hersteller: string | null;
  modell: string | null;
  anschaffungsdatum: string | null;
  anschaffungspreis: number | null;
  zustand: string | null;
  raumId: number | null;
  raumName: string | null;
  raumStandort: string | null;
  raumBranch: string | null;
  benutzerId: number | null;
  benutzerName: string | null;
  notiz: string | null;
  abgang: string | null;
  abgangGrund: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  ID: number;
  Name: string;
}

interface Option {
  id: number;
  name: string;
}

interface RoomOption extends Option {
  standort: string | null;
  branch: string | null;
}

interface UserOption extends Option {
  roomId: number | null;
}

type Period = { id: number; start: string; end: string | null };

interface HsModRelation {
  HSID: number;
  ModID: number;
}

interface KatHsModRelation extends KatHsModPair {
  HSID: number;
  ModID: number;
}

interface Movement {
  ID: number;
  Typ: string;
  Zeitpunkt: string;
  Bemerkung: string | null;
  VonRaumID: number | null;
  NachRaumID: number | null;
  VonBenutzerID: number | null;
  NachBenutzerID: number | null;
  VonBenutzer: { BenutzerName: string | null } | null;
  NachBenutzer: { BenutzerName: string | null } | null;
}

interface CurrentUser {
  role: string;
  permissions?: string[];
}

type ItemForm = {
  kategorieId: string;
  bezeichnung: string;
  beschreibung: string;
  inventarNr: string;
  seriennummer: string;
  hersteller: string;
  modell: string;
  anschaffungsdatum: string;
  anschaffungspreis: string;
  zustand: string;
  raumId: string;
  benutzerId: string;
  notiz: string;
};

type SortColumn =
  | 'inventarNr'
  | 'bezeichnung'
  | 'kategorieName'
  | 'hersteller'
  | 'zustand'
  | 'benutzerName'
  | 'raumName'
  | 'anschaffungspreis';

const emptyForm: ItemForm = {
  kategorieId: '',
  bezeichnung: '',
  beschreibung: '',
  inventarNr: '',
  seriennummer: '',
  hersteller: '',
  modell: '',
  anschaffungsdatum: '',
  anschaffungspreis: '',
  zustand: 'GUT',
  raumId: '',
  benutzerId: '',
  notiz: '',
};

const ZUSTAENDE: Record<string, { label: string; badge: string; dot: string }> = {
  NEU: { label: 'Neu', badge: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
  GUT: { label: 'Gut', badge: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  GEBRAUCHT: { label: 'Gebraucht', badge: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
  BESCHAEDIGT: { label: 'Beschädigt', badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  REPARATUR: { label: 'Reparatur', badge: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  DEFEKT: { label: 'Defekt', badge: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
};

const PAGE_SIZE = 25;

const inputClass =
  'w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary';
const filterClass =
  'px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary';

const formatCurrency = (value: number | null) =>
  value != null ? value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) : '—';

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleDateString('de-DE') : '—');

const itemToForm = (item: OfficeItem): ItemForm => ({
  kategorieId: String(item.kategorieId ?? ''),
  bezeichnung: item.bezeichnung ?? '',
  beschreibung: item.beschreibung ?? '',
  inventarNr: item.inventarNr ?? '',
  seriennummer: item.seriennummer ?? '',
  hersteller: item.hersteller ?? '',
  modell: item.modell ?? '',
  anschaffungsdatum: item.anschaffungsdatum ? new Date(item.anschaffungsdatum).toISOString().split('T')[0] : '',
  anschaffungspreis: item.anschaffungspreis != null ? String(item.anschaffungspreis) : '',
  zustand: item.zustand || 'GUT',
  raumId: item.raumId ? String(item.raumId) : '',
  benutzerId: item.benutzerId ? String(item.benutzerId) : '',
  notiz: item.notiz ?? '',
});

const formToPayload = (form: ItemForm) => ({
  kategorieId: Number(form.kategorieId),
  bezeichnung: form.bezeichnung.trim(),
  beschreibung: form.beschreibung || null,
  inventarNr: form.inventarNr || null,
  seriennummer: form.seriennummer || null,
  hersteller: form.hersteller.trim() || null,
  modell: form.modell.trim() || null,
  anschaffungsdatum: form.anschaffungsdatum || null,
  anschaffungspreis: form.anschaffungspreis ? Number(form.anschaffungspreis) : null,
  zustand: form.zustand || 'GUT',
  raumId: form.raumId ? Number(form.raumId) : null,
  benutzerId: form.benutzerId ? Number(form.benutzerId) : null,
  notiz: form.notiz || null,
});

const describeMeta = (meta?: { herstellerCreated?: boolean; modellCreated?: boolean; relationCreated?: boolean }) => {
  const parts = [
    meta?.herstellerCreated && 'Hersteller angelegt',
    meta?.modellCreated && 'Modell angelegt',
    meta?.relationCreated && 'Verknüpfung erstellt',
  ].filter(Boolean);
  return parts.length ? ` (${parts.join(', ')})` : '';
};

function ZustandBadge({ zustand, abgang }: { zustand: string | null; abgang?: string | null }) {
  if (abgang) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-200 text-gray-700">
        <Archive className="w-3 h-3" />
        Abgeschrieben
      </span>
    );
  }
  if (!zustand) return <span className="text-gray-400">—</span>;
  const config = ZUSTAENDE[zustand] ?? { label: zustand, badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${config.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

interface ItemFormFieldsProps {
  form: ItemForm;
  setForm: React.Dispatch<React.SetStateAction<ItemForm>>;
  categories: Category[];
  rooms: RoomOption[];
  users: UserOption[];
  manufacturers: Option[];
  models: Option[];
  hsModRelations: HsModRelation[];
  katRelations: KatHsModRelation[];
  columns: 1 | 2;
  onGenerateNr?: () => void;
}

function ItemFormFields({
  form,
  setForm,
  categories,
  rooms,
  users,
  manufacturers,
  models,
  hsModRelations,
  katRelations,
  columns,
  onGenerateNr,
}: ItemFormFieldsProps) {
  const set = (field: keyof ItemForm) => (value: string) => setForm((prev) => ({ ...prev, [field]: value }));
  const select = filterOfficeSelectOptions(form.kategorieId, form.hersteller, katRelations, hsModRelations, manufacturers, models);
  const label = 'block text-xs font-medium text-gray-700 mb-1';

  return (
    <div className="space-y-3">
      <div className={`grid grid-cols-1 ${columns === 2 ? 'sm:grid-cols-2' : ''} gap-3`}>
        <div>
          <label className={label}>Kategorie *</label>
          <SearchableSelect
            options={categories.map((c) => ({ value: String(c.ID), label: c.Name }))}
            value={form.kategorieId}
            onChange={set('kategorieId')}
            placeholder="-- Kategorie wählen --"
            searchPlaceholder="Kategorie suchen..."
            required
            className="text-xs"
          />
        </div>
        <div>
          <label className={label}>Bezeichnung *</label>
          <input
            type="text"
            value={form.bezeichnung}
            onChange={(e) => set('bezeichnung')(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={label}>Hersteller</label>
          <SearchableSelectWithCustom
            options={select.manufacturers.map((m) => ({ value: m.name, label: m.name }))}
            value={form.hersteller}
            onChange={set('hersteller')}
            placeholder="-- Hersteller wählen --"
            searchPlaceholder="Hersteller suchen..."
            customPlaceholder="Neuen Hersteller eingeben..."
            className="text-xs"
          />
        </div>
        <div>
          <label className={label}>Modell</label>
          <SearchableSelectWithCustom
            options={select.models.map((m) => ({ value: m.name, label: m.name }))}
            value={form.modell}
            onChange={set('modell')}
            placeholder="-- Modell wählen --"
            searchPlaceholder="Modell suchen..."
            customPlaceholder="Neues Modell eingeben..."
            className="text-xs"
          />
          {select.hint && <p className="text-[10px] text-gray-500 mt-0.5">{select.hint}</p>}
        </div>
        <div>
          <label className={label}>Inventarnummer</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.inventarNr}
              onChange={(e) => set('inventarNr')(e.target.value)}
              placeholder={onGenerateNr ? 'Leer = automatisch' : ''}
              className={inputClass}
            />
            {onGenerateNr && (
              <button
                type="button"
                onClick={onGenerateNr}
                disabled={!form.kategorieId}
                title="Nächste Nummer für die Kategorie vorschlagen"
                className="px-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <div>
          <label className={label}>Seriennummer</label>
          <input
            type="text"
            value={form.seriennummer}
            onChange={(e) => set('seriennummer')(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={label}>Anschaffungsdatum</label>
          <input
            type="date"
            value={form.anschaffungsdatum}
            onChange={(e) => set('anschaffungsdatum')(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={label}>Anschaffungspreis (€)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.anschaffungspreis}
            onChange={(e) => set('anschaffungspreis')(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={label}>Zustand</label>
          <select value={form.zustand} onChange={(e) => set('zustand')(e.target.value)} className={inputClass}>
            {Object.entries(ZUSTAENDE).map(([value, { label: text }]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </div>
        <RoomUserSelects
          rooms={rooms}
          users={users}
          raumId={form.raumId}
          benutzerId={form.benutzerId}
          onChange={(next) => setForm((prev) => ({ ...prev, ...next }))}
          labelClass={label}
        />
      </div>
      <div>
        <label className={label}>Beschreibung</label>
        <textarea
          rows={2}
          value={form.beschreibung}
          onChange={(e) => set('beschreibung')(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className={label}>Notiz</label>
        <textarea rows={2} value={form.notiz} onChange={(e) => set('notiz')(e.target.value)} className={inputClass} />
      </div>
    </div>
  );
}

export default function OfficeInventoryPage() {
  const [items, setItems] = useState<OfficeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [manufacturers, setManufacturers] = useState<Option[]>([]);
  const [models, setModels] = useState<Option[]>([]);
  const [hsModRelations, setHsModRelations] = useState<HsModRelation[]>([]);
  const [katRelations, setKatRelations] = useState<KatHsModRelation[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [zustandFilter, setZustandFilter] = useState('');
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [showRetired, setShowRetired] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>('inventarNr');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);

  const [creating, setCreating] = useState(false);
  const [newItem, setNewItem] = useState<ItemForm>(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<ItemForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [assignment, setAssignment] = useState({ raumId: '', benutzerId: '' });
  const [assignSaving, setAssignSaving] = useState(false);
  const [retireOpen, setRetireOpen] = useState(false);
  const [retireForm, setRetireForm] = useState({ datum: '', grund: '' });
  const [retireSaving, setRetireSaving] = useState(false);

  const hasPermission = (permission: string) =>
    currentUser?.role === 'ADMIN' || !!currentUser?.permissions?.includes(permission);
  const canView = hasPermission('office_inventory:view');
  const canCreate = hasPermission('office_inventory:create');
  const canEdit = hasPermission('office_inventory:edit');
  const canRetire = hasPermission('office_inventory:delete');

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await fetch('/api/office-inventory', { cache: 'no-store' });
      if (!res.ok) throw new Error('Büroinventar konnte nicht geladen werden');
      setItems(await res.json());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMasterData = useCallback(async () => {
    const [hsRes, modRes, relRes, katRes] = await Promise.all([
      fetch('/api/office-manufacturers?includeAll=true', { cache: 'no-store' }),
      fetch('/api/office-models?includeAll=true', { cache: 'no-store' }),
      fetch('/api/relations/hs-mod', { cache: 'no-store' }),
      fetch('/api/relations/kat-hs-mod', { cache: 'no-store' }),
    ]);
    if (hsRes.ok) setManufacturers((await hsRes.json()).manufacturers ?? []);
    if (modRes.ok) {
      const data = await modRes.json();
      setModels(
        (data.models ?? [])
          .map((m: any) => ({ id: Number(m.id), name: m.name }))
          .sort((a: Option, b: Option) => a.name.localeCompare(b.name, 'de'))
      );
    }
    if (relRes.ok) {
      const data = await relRes.json();
      setHsModRelations((data.relations ?? []).map((r: any) => ({ HSID: Number(r.HSID), ModID: Number(r.ModID) })));
    }
    if (katRes.ok) {
      const data = await katRes.json();
      setKatRelations((data.relations ?? []).map((r: any) => ({ KategorieID: Number(r.KategorieID), HSID: Number(r.HSID), ModID: Number(r.ModID) })));
    }
  }, []);

  useEffect(() => {
    loadItems();
    loadMasterData().catch((err) => console.error('Fehler beim Laden der Stammdaten:', err));

    (async () => {
      const [catRes, userRes, roomRes, meRes] = await Promise.all([
        fetch('/api/office-categories'),
        fetch('/api/inventory-users'),
        fetch('/api/rooms'),
        fetch('/api/auth/me'),
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (userRes.ok) {
        setUsers(
          ((await userRes.json()).users ?? []).map((u: any) => ({
            id: u.id,
            name: u.name || `Benutzer ${u.id}`,
            roomId: u.room?.id ?? null,
          }))
        );
      }
      if (roomRes.ok) {
        setRooms(
          ((await roomRes.json()).rooms ?? []).map((r: any) => ({
            id: r.RaumID,
            name: r.RaumName,
            standort: r.Standort,
            branch: r.GS?.GSName ?? null,
          }))
        );
      }
      if (meRes.ok) setCurrentUser((await meRes.json()).user);
    })().catch((err) => console.error('Fehler beim Laden der Auswahllisten:', err));
  }, [loadItems, loadMasterData]);

  // Verlauf des ausgewählten Eintrags laden
  useEffect(() => {
    setIsEditing(false);
    setRetireOpen(false);
    setMovements([]);
    if (!selectedItemId) return;

    let cancelled = false;
    setMovementsLoading(true);
    fetch(`/api/office-inventory/${selectedItemId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setMovements(data?.Bewegungen ?? []);
      })
      .catch(() => {
        if (!cancelled) setMovements([]);
      })
      .finally(() => {
        if (!cancelled) setMovementsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedItemId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, userFilter, roomFilter, zustandFilter, showUnassignedOnly, showRetired]);


  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    const result = items.filter((item) => {
      if (
        term &&
        ![item.bezeichnung, item.inventarNr, item.seriennummer, item.hersteller, item.modell, item.benutzerName]
          .some((field) => field?.toLowerCase().includes(term))
      ) {
        return false;
      }
      if (categoryFilter && item.kategorieId !== Number(categoryFilter)) return false;
      if (userFilter && item.benutzerId !== Number(userFilter)) return false;
      if (roomFilter && item.raumId !== Number(roomFilter)) return false;
      if (zustandFilter && item.zustand !== zustandFilter) return false;
      if (showUnassignedOnly && item.benutzerId) return false;
      if (!showRetired && item.abgang) return false;
      return true;
    });

    const direction = sortDirection === 'asc' ? 1 : -1;
    return result.sort((a, b) => {
      const av = a[sortColumn];
      const bv = b[sortColumn];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * direction;
      return String(av).localeCompare(String(bv), 'de', { numeric: true }) * direction;
    });
  }, [items, search, categoryFilter, userFilter, roomFilter, zustandFilter, showUnassignedOnly, showRetired, sortColumn, sortDirection]);

  const retiredCount = useMemo(() => items.filter((item) => item.abgang).length, [items]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
  const totalValue = filteredItems.reduce((sum, item) => sum + (item.anschaffungspreis ?? 0), 0);
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;

  // Zuordnungsauswahl auf den aktuellen Stand des Eintrags zurücksetzen
  useEffect(() => {
    setAssignment({
      raumId: selectedItem?.raumId ? String(selectedItem.raumId) : '',
      benutzerId: selectedItem?.benutzerId ? String(selectedItem.benutzerId) : '',
    });
  }, [selectedItem?.id, selectedItem?.raumId, selectedItem?.benutzerId]);

  const assignmentChanged =
    !!selectedItem &&
    (assignment.raumId !== String(selectedItem.raumId ?? '') ||
      assignment.benutzerId !== String(selectedItem.benutzerId ?? ''));

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const showSuccess = (message: string) => {
    setActionError(null);
    setActionSuccess(message);
    setTimeout(() => setActionSuccess(null), 5000);
  };

  async function generateInventarNr() {
    if (!newItem.kategorieId) return;
    const res = await fetch(`/api/office-inventory/next-number?kategorieId=${newItem.kategorieId}`);
    if (res.ok) {
      const data = await res.json();
      setNewItem((prev) => ({ ...prev, inventarNr: data.inventarNr }));
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setActionError(null);
    try {
      const res = await fetch('/api/office-inventory/create-with-relations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formToPayload(newItem)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.details || data.error || 'Fehler beim Erstellen');

      setNewItem(emptyForm);
      setCreating(false);
      showSuccess(`Inventar erstellt${describeMeta(data._meta)}`);
      await Promise.all([loadItems(), loadMasterData()]);
      if (data.id) setSelectedItemId(data.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Fehler beim Erstellen');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem) return;
    setSaving(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/office-inventory/${selectedItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formToPayload(editItem)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.details || data.error || 'Fehler beim Speichern');

      setIsEditing(false);
      showSuccess(`Änderungen gespeichert${describeMeta(data._meta)}`);
      await Promise.all([loadItems(), loadMasterData()]);
      const detailRes = await fetch(`/api/office-inventory/${selectedItem.id}`);
      if (detailRes.ok) setMovements((await detailRes.json()).Bewegungen ?? []);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  }

  const openRetire = () => {
    setRetireForm({ datum: new Date().toISOString().split('T')[0], grund: '' });
    setRetireOpen(true);
    setActionError(null);
  };

  async function handleRetire(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem) return;
    setRetireSaving(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/office-inventory/${selectedItem.id}/retire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(retireForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Abschreibung fehlgeschlagen');
      setRetireOpen(false);
      showSuccess(
        showRetired
          ? `„${selectedItem.bezeichnung}“ wurde abgeschrieben`
          : `„${selectedItem.bezeichnung}“ wurde abgeschrieben und wird in der Liste ausgeblendet`
      );
      await Promise.all([loadItems(), reloadMovements(selectedItem.id)]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Abschreibung fehlgeschlagen');
    } finally {
      setRetireSaving(false);
    }
  }

  const startEdit = () => {
    if (!selectedItem) return;
    setEditItem(itemToForm(selectedItem));
    setIsEditing(true);
    setActionError(null);
  };

  const reloadMovements = async (id: number) => {
    const res = await fetch(`/api/office-inventory/${id}`);
    if (res.ok) setMovements((await res.json()).Bewegungen ?? []);
  };

  async function saveAssignment(next: { raumId: string; benutzerId: string }) {
    if (!selectedItem) return;
    setAssignSaving(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/office-inventory/${selectedItem.id}/assignment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raumId: next.raumId ? Number(next.raumId) : null,
          benutzerId: next.benutzerId ? Number(next.benutzerId) : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Zuordnung konnte nicht gespeichert werden');
      showSuccess('Zuordnung gespeichert');
      await Promise.all([loadItems(), reloadMovements(selectedItem.id)]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Zuordnung konnte nicht gespeichert werden');
    } finally {
      setAssignSaving(false);
    }
  }

  const userName = (id: number) => users.find((u) => u.id === id)?.name ?? `Benutzer ${id}`;
  const roomName = (id: number) => rooms.find((r) => r.id === id)?.name ?? `Raum ${id}`;

  // Zeiträume (von/bis) aus den Bewegungen ableiten, neueste zuerst
  const buildPeriods = (
    from: (m: Movement) => number | null,
    to: (m: Movement) => number | null,
    current: number | null
  ): Period[] => {
    // Nach Buchungsreihenfolge (ID) sortieren: rückdatierte Abschreibungen bleiben so am Ende
    const ordered = [...movements].sort((a, b) => a.ID - b.ID);
    const periods: Period[] = [];
    let active = ordered.length ? from(ordered[0]) : current;
    let start = selectedItem?.createdAt ?? '';
    for (const m of ordered) {
      const next = to(m);
      if (next === active) continue;
      if (active != null) periods.push({ id: active, start, end: m.Zeitpunkt });
      active = next;
      start = m.Zeitpunkt;
    }
    if (active != null) periods.push({ id: active, start, end: null });
    return periods.reverse();
  };

  const historySections = [
    {
      title: 'Benutzer',
      icon: UserRound,
      name: userName,
      empty: 'Noch keinem Benutzer zugewiesen.',
      periods: buildPeriods((m) => m.VonBenutzerID, (m) => m.NachBenutzerID, selectedItem?.benutzerId ?? null),
    },
    {
      title: 'Raum',
      icon: MapPin,
      name: roomName,
      empty: 'Noch keinem Raum zugewiesen.',
      periods: buildPeriods((m) => m.VonRaumID, (m) => m.NachRaumID, selectedItem?.raumId ?? null),
    },
  ];

  const MOVEMENT_TYPES: Record<string, string> = {
    ZUGANG: 'Zugang',
    ZUWEISUNG: 'Zuweisung',
    RUECKGABE: 'Rückgabe',
    STANDORTWECHSEL: 'Standortwechsel',
    ABGANG: 'Abgeschrieben',
  };

  const describeMovement = (m: Movement) => {
    const lines: string[] = [];
    const personName = (id: number | null, rel: { BenutzerName: string | null } | null) =>
      id ? rel?.BenutzerName || userName(id) : '—';
    if (m.VonBenutzerID !== m.NachBenutzerID) {
      lines.push(`Benutzer: ${personName(m.VonBenutzerID, m.VonBenutzer)} → ${personName(m.NachBenutzerID, m.NachBenutzer)}`);
    }
    if (m.VonRaumID !== m.NachRaumID) {
      lines.push(
        `Raum: ${m.VonRaumID ? roomName(m.VonRaumID) : '—'} → ${m.NachRaumID ? roomName(m.NachRaumID) : '—'}`
      );
    }
    return lines;
  };

  const events = [...movements].sort((a, b) => b.ID - a.ID);

  const formFieldProps = { categories, rooms, users, manufacturers, models, hsModRelations, katRelations };

  const SortHeader = ({ column, label }: { column: SortColumn; label: string }) => (
    <th
      className="px-2 py-2 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 select-none"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {sortColumn === column ? (
          sortDirection === 'asc' ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )
        ) : (
          <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400" />
        )}
      </div>
    </th>
  );

  const renderDetailCards = () => (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <UserRound className="w-4 h-4 text-primary-dark" />
            Stammdaten & Zuordnung
          </h2>
          {selectedItem && !selectedItem.abgang && canEdit && !isEditing && (
            <button
              type="button"
              onClick={startEdit}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-primary-dark bg-primary/10 rounded-lg hover:bg-primary/20"
            >
              <Edit2 className="w-3 h-3" />
              Bearbeiten
            </button>
          )}
        </div>

        {!selectedItem ? (
          <p className="text-xs text-gray-500">Wähle links einen Eintrag, um Details zu sehen und ihn zu bearbeiten.</p>
        ) : isEditing ? (
          <form onSubmit={handleUpdate} className="space-y-3">
            <ItemFormFields form={editItem} setForm={setEditItem} columns={2} {...formFieldProps} />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-3 py-1.5 text-xs rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-50"
              >
                {saving ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="mb-3 text-xs text-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-primary-dark">{selectedItem.inventarNr || 'ohne Inventar-Nr.'}</span>
                <ZustandBadge zustand={selectedItem.zustand} abgang={selectedItem.abgang} />
              </div>
              <div className="font-medium text-gray-900 mb-1">{selectedItem.bezeichnung}</div>
              <div>{selectedItem.kategorieName}</div>
              <div>{[selectedItem.hersteller, selectedItem.modell].filter(Boolean).join(' · ') || '—'}</div>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] text-gray-600">
              <div>
                <div className="text-gray-500">Seriennummer</div>
                <div className="font-medium text-gray-900 truncate">{selectedItem.seriennummer || '—'}</div>
              </div>
              <div>
                <div className="text-gray-500">Anschaffungsdatum</div>
                <div className="font-medium text-gray-900">{formatDate(selectedItem.anschaffungsdatum)}</div>
              </div>
              <div>
                <div className="text-gray-500">Anschaffungspreis</div>
                <div className="font-medium text-gray-900">{formatCurrency(selectedItem.anschaffungspreis)}</div>
              </div>
              <div>
                <div className="text-gray-500">Zuletzt geändert</div>
                <div className="font-medium text-gray-900">{formatDate(selectedItem.updatedAt)}</div>
              </div>
            </div>

            <div className="mb-3 text-xs text-gray-700 space-y-1">
              <div>
                <span className="text-gray-500 mr-1">Zugewiesen an:</span>
                <span className="font-medium">{selectedItem.benutzerName || '— keiner —'}</span>
              </div>
              <div className="flex items-start gap-2 mt-1">
                <MapPin className="w-3.5 h-3.5 mt-0.5 text-primary-dark" />
                <div>
                  <div className="font-medium text-gray-900">{selectedItem.raumName || '— kein Raum hinterlegt —'}</div>
                  {(selectedItem.raumStandort || selectedItem.raumBranch) && (
                    <div className="text-[11px] text-gray-500">
                      {[selectedItem.raumStandort, selectedItem.raumBranch].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {selectedItem.abgang && (
              <div className="mb-3 rounded-lg border border-gray-300 bg-gray-100 p-3 text-xs text-gray-700">
                <div className="font-semibold flex items-center gap-1.5 mb-0.5">
                  <Archive className="w-3.5 h-3.5" />
                  Abgeschrieben am {formatDate(selectedItem.abgang)}
                </div>
                {selectedItem.abgangGrund && <div className="whitespace-pre-wrap">{selectedItem.abgangGrund}</div>}
              </div>
            )}

            {canEdit && !selectedItem.abgang && (
              <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50/60 p-3 space-y-2">
                <div className="text-xs font-medium text-gray-700">Zuordnung ändern</div>
                <RoomUserSelects
                  rooms={rooms}
                  users={users}
                  raumId={assignment.raumId}
                  benutzerId={assignment.benutzerId}
                  onChange={setAssignment}
                  labelClass="block text-[11px] font-medium text-gray-600 mb-1"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => saveAssignment(assignment)}
                    disabled={assignSaving || !assignmentChanged}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs hover:bg-primary-dark disabled:opacity-50"
                  >
                    {assignSaving ? 'Speichert...' : 'Zuordnung speichern'}
                  </button>
                  <button
                    type="button"
                    onClick={() => saveAssignment({ raumId: String(selectedItem.raumId ?? ''), benutzerId: '' })}
                    disabled={assignSaving || !selectedItem.benutzerId}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-xs hover:bg-gray-50 disabled:opacity-50"
                  >
                    Benutzer entfernen
                  </button>
                </div>
              </div>
            )}

            {(selectedItem.beschreibung || selectedItem.notiz) && (
              <div className="mb-3 space-y-2 text-xs">
                {selectedItem.beschreibung && (
                  <div>
                    <div className="text-[11px] text-gray-500">Beschreibung</div>
                    <div className="text-gray-800 whitespace-pre-wrap">{selectedItem.beschreibung}</div>
                  </div>
                )}
                {selectedItem.notiz && (
                  <div>
                    <div className="text-[11px] text-gray-500">Notiz</div>
                    <div className="text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg px-2 py-1.5">
                      {selectedItem.notiz}
                    </div>
                  </div>
                )}
              </div>
            )}

            {canRetire && !selectedItem.abgang && (
              <div className="border-t border-gray-100 pt-3 mt-2">
                {!retireOpen ? (
                  <button
                    type="button"
                    onClick={openRetire}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 text-xs text-red-700 hover:bg-red-100"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    Abschreiben
                  </button>
                ) : (
                  <form onSubmit={handleRetire} className="rounded-lg border border-red-200 bg-red-50/50 p-3 space-y-2">
                    <div className="text-xs font-semibold text-red-700">„{selectedItem.bezeichnung}“ abschreiben</div>
                    <p className="text-[11px] text-gray-600">
                      Raum- und Benutzerzuordnung werden beendet. Der Eintrag bleibt mit Verlauf erhalten.
                    </p>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 mb-1">Datum</label>
                      <input
                        type="date"
                        required
                        value={retireForm.datum}
                        onChange={(e) => setRetireForm((prev) => ({ ...prev, datum: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 mb-1">Grund *</label>
                      <textarea
                        rows={2}
                        required
                        value={retireForm.grund}
                        onChange={(e) => setRetireForm((prev) => ({ ...prev, grund: e.target.value }))}
                        placeholder="z.B. defekt, entsorgt, verkauft"
                        className={inputClass}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={retireSaving || !retireForm.grund.trim()}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs hover:bg-red-700 disabled:opacity-50"
                      >
                        {retireSaving ? 'Wird abgeschrieben...' : 'Abschreiben'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRetireOpen(false)}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-xs hover:bg-gray-50"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-primary-dark" />
          Verlauf
        </h2>
        {!selectedItem ? (
          <p className="text-xs text-gray-500">Wähle links einen Eintrag, um den Verlauf zu sehen.</p>
        ) : movementsLoading ? (
          <div className="flex items-center justify-center py-6">
            <RefreshCw className="w-5 h-5 text-primary-dark animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
          {selectedItem.abgang && (
            <div className="rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-xs text-gray-700">
              <div className="font-semibold flex items-center gap-1.5">
                <Archive className="w-3.5 h-3.5" />
                Abgeschrieben am {formatDate(selectedItem.abgang)}
              </div>
              {selectedItem.abgangGrund && (
                <div className="text-[11px] text-gray-600 whitespace-pre-wrap mt-0.5">{selectedItem.abgangGrund}</div>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {historySections.map(({ title, icon: Icon, name, empty, periods }) => (
              <div key={title} className="min-w-0">
                <div className="text-[11px] font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                  <Icon className="w-3 h-3 text-primary-dark" />
                  {title}
                </div>
                {periods.length === 0 ? (
                  <p className="text-[11px] text-gray-500">{empty}</p>
                ) : (
                  <ul className="space-y-2 text-xs text-gray-700 overflow-y-auto max-h-72 pr-1">
                    {periods.map((p) => (
                      <li
                        key={`${p.id}-${p.start}`}
                        className={`rounded-lg border px-3 py-2 ${
                          p.end ? 'border-gray-200 bg-gray-50/60' : 'border-primary/40 bg-primary/5'
                        }`}
                      >
                        <div className="font-medium text-gray-900 mb-0.5 break-words">{name(p.id)}</div>
                        <div className="text-[11px] text-gray-600">
                          <span className="mr-1">von</span>
                          {formatDate(p.start)}
                          <span className="mx-1">bis</span>
                          {p.end ? formatDate(p.end) : 'heute'}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <div>
            <div className="text-[11px] font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
              <History className="w-3 h-3 text-primary-dark" />
              Ereignisse
            </div>
            {events.length === 0 ? (
              <p className="text-[11px] text-gray-500">Noch keine Ereignisse erfasst.</p>
            ) : (
              <ol className="relative border-l border-gray-200 ml-1.5 space-y-2 max-h-72 overflow-y-auto pr-1">
                {events.map((m) => (
                  <li key={m.ID} className="ml-3">
                    <span
                      className={`absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                        m.Typ === 'ABGANG' ? 'bg-gray-500' : 'bg-primary'
                      }`}
                    />
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-medium text-gray-900">{MOVEMENT_TYPES[m.Typ] ?? m.Typ}</span>
                      <span className="text-[11px] text-gray-500 shrink-0">{formatDate(m.Zeitpunkt)}</span>
                    </div>
                    {describeMovement(m).map((line) => (
                      <div key={line} className="text-[11px] text-gray-600 break-words">
                        {line}
                      </div>
                    ))}
                    {m.Bemerkung && <div className="text-[11px] text-gray-500 break-words">{m.Bemerkung}</div>}
                  </li>
                ))}
              </ol>
            )}
          </div>
          </div>
        )}
      </div>
    </>
  );

  if (currentUser && !canView) {
    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">Keine Berechtigung</p>
          <p className="mt-1 text-sm text-gray-500">Für das Büroinventar fehlt dir die Berechtigung „Büroinventar anzeigen“.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 flex flex-col">
      {/* Seitenkopf */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg shadow-sm">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-semibold text-gray-900">Büroinventar</h1>
              <p className="text-xs text-gray-500">Büromöbel und -ausstattung anlegen, zuweisen und Verlauf einsehen</p>
            </div>
          </div>
        </div>
      </header>

      {/* Inhalt */}
      <div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-4">
          {actionError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 flex items-center justify-between">
              <span>{actionError}</span>
              <button type="button" onClick={() => setActionError(null)}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {actionSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-700">
              {actionSuccess}
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Liste, Filter & Neuanlage */}
            <section className="flex-1 min-w-0 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary-dark" />
                  Inventar
                </h2>
                {canCreate && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-1.5 text-xs font-medium text-primary-dark hover:bg-primary/10"
                    onClick={() => setCreating((prev) => !prev)}
                  >
                    <Plus className="w-3 h-3" />
                    Neues Inventar
                  </button>
                )}
              </div>

              {creating && (
                <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                  <ItemFormFields
                    form={newItem}
                    setForm={setNewItem}
                    columns={2}
                    onGenerateNr={generateInventarNr}
                    {...formFieldProps}
                  />
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setCreating(false)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-3 py-1.5 text-xs rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-50"
                    >
                      {saving ? 'Speichern...' : 'Speichern'}
                    </button>
                  </div>
                </form>
              )}

              {/* Filter */}
              <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Suchen (Bezeichnung, Inventar-Nr., Seriennummer, Hersteller, Modell, Benutzer)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`w-full ${filterClass}`}
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={filterClass}>
                    <option value="">Alle Kategorien</option>
                    {categories.map((c) => (
                      <option key={c.ID} value={c.ID}>
                        {c.Name}
                      </option>
                    ))}
                  </select>
                  <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className={filterClass}>
                    <option value="">Alle Benutzer</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  <select value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)} className={filterClass}>
                    <option value="">Alle Räume</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                        {r.branch ? ` (${r.branch})` : ''}
                      </option>
                    ))}
                  </select>
                  <select value={zustandFilter} onChange={(e) => setZustandFilter(e.target.value)} className={filterClass}>
                    <option value="">Alle Zustände</option>
                    {Object.entries(ZUSTAENDE).map(([value, { label }]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2 text-gray-600 text-[11px] font-medium">
                    <input
                      type="checkbox"
                      checked={showUnassignedOnly}
                      onChange={(e) => setShowUnassignedOnly(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-1 focus:ring-primary"
                    />
                    Nur ohne Benutzer
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowRetired((prev) => !prev)}
                    aria-pressed={showRetired}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${
                      showRetired
                        ? 'border-gray-700 bg-gray-700 text-white'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Archive className="w-3.5 h-3.5" />
                    {showRetired ? 'Abgeschriebene ausblenden' : 'Abgeschriebene anzeigen'}
                    <span className={`rounded-full px-1.5 ${showRetired ? 'bg-white/20' : 'bg-gray-100'}`}>{retiredCount}</span>
                  </button>
                </div>
              </div>

              {/* Liste */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 text-xs text-gray-500">
                  <span>
                    {filteredItems.length} Einträge
                    {items.length !== filteredItems.length && (
                      <span className="text-gray-400"> von {items.length} gesamt</span>
                    )}
                    <span className="text-gray-400"> · Wert {formatCurrency(totalValue)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      loadItems();
                      loadMasterData();
                    }}
                    className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Aktualisieren
                  </button>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-5 h-5 text-primary-dark animate-spin" />
                  </div>
                ) : loadError ? (
                  <div className="p-4 text-sm text-red-600">{loadError}</div>
                ) : (
                  <>
                    {/* Desktop: Tabelle */}
                    <div className="hidden md:block">
                      <table className="w-full table-fixed text-xs">
                        <colgroup>
                          <col className="w-[15%]" />
                          <col className="w-[22%]" />
                          <col className="w-[14%]" />
                          <col className="w-[17%]" />
                          <col className="w-[13%]" />
                          <col className="w-[19%]" />
                        </colgroup>
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <SortHeader column="inventarNr" label="Inventar-Nr." />
                            <SortHeader column="bezeichnung" label="Bezeichnung" />
                            <SortHeader column="kategorieName" label="Kategorie" />
                            <SortHeader column="hersteller" label="Hersteller / Modell" />
                            <SortHeader column="zustand" label="Zustand" />
                            <SortHeader column="benutzerName" label="Zuordnung" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {paginatedItems.map((item) => {
                            const isSelected = item.id === selectedItemId;
                            return (
                              <tr
                                key={item.id}
                                className={`cursor-pointer transition-colors ${item.abgang ? 'opacity-60' : ''} ${
                                  isSelected
                                    ? 'bg-primary/10 border-l-4 border-primary shadow-sm'
                                    : 'hover:bg-gray-50 border-l-4 border-transparent'
                                }`}
                                onClick={() => setSelectedItemId(item.id)}
                              >
                                <td className={`px-2 py-2 font-semibold break-words ${isSelected ? 'text-primary' : 'text-primary-dark'}`}>
                                  {item.inventarNr || '—'}
                                </td>
                                <td className="px-2 py-2 font-medium text-gray-900 break-words">
                                  {item.bezeichnung}
                                  {item.seriennummer && (
                                    <div className="text-[11px] font-normal text-gray-500 break-all">SN: {item.seriennummer}</div>
                                  )}
                                </td>
                                <td className="px-2 py-2 text-gray-700 break-words">{item.kategorieName}</td>
                                <td className="px-2 py-2 text-gray-700 break-words">
                                  <div>{item.hersteller || '—'}</div>
                                  {item.modell && <div className="text-[11px] text-gray-500">{item.modell}</div>}
                                </td>
                                <td className="px-2 py-2">
                                  <ZustandBadge zustand={item.zustand} abgang={item.abgang} />
                                </td>
                                <td className="px-2 py-2 text-gray-700 break-words">
                                  {item.benutzerName && (
                                    <div className="flex items-center gap-1 text-gray-900">
                                      <UserRound className="w-3 h-3 shrink-0 text-primary-dark" />
                                      {item.benutzerName}
                                    </div>
                                  )}
                                  {item.raumName && (
                                    <div className="flex items-center gap-1 text-[11px] text-gray-500">
                                      <MapPin className="w-3 h-3 shrink-0" />
                                      {item.raumName}
                                      {item.raumBranch ? ` · ${item.raumBranch}` : ''}
                                    </div>
                                  )}
                                  {!item.benutzerName && !item.raumName && '—'}
                                </td>
                              </tr>
                            );
                          })}
                          {filteredItems.length === 0 && (
                            <tr>
                              <td className="px-3 py-4 text-center text-gray-500" colSpan={6}>
                                Keine Einträge gefunden
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile: Karten-Layout */}
                    <div className="md:hidden divide-y divide-gray-100">
                      {paginatedItems.map((item) => {
                        const isSelected = item.id === selectedItemId;
                        return (
                          <div
                            key={item.id}
                            className={`p-3 cursor-pointer transition-colors ${item.abgang ? 'opacity-60' : ''} ${
                              isSelected
                                ? 'bg-primary/10 border-l-4 border-primary shadow-sm'
                                : 'active:bg-gray-100 border-l-4 border-transparent'
                            }`}
                            onClick={() => {
                              setSelectedItemId(item.id);
                              setShowMobileDetail(true);
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-sm text-primary-dark">{item.inventarNr || '—'}</span>
                                  <span className="font-medium text-sm text-gray-900 truncate">{item.bezeichnung}</span>
                                  <ZustandBadge zustand={item.zustand} abgang={item.abgang} />
                                </div>
                                <div className="text-xs text-gray-600 truncate">
                                  {[item.kategorieName, item.hersteller, item.modell].filter(Boolean).join(' · ')}
                                </div>
                                {item.benutzerName && (
                                  <div className="text-xs text-primary-dark mt-0.5 flex items-center gap-1">
                                    <UserRound className="w-3 h-3" />
                                    {item.benutzerName}
                                  </div>
                                )}
                                {item.raumName && (
                                  <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {item.raumName}
                                  </div>
                                )}
                              </div>
                              <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                            </div>
                          </div>
                        );
                      })}
                      {filteredItems.length === 0 && (
                        <div className="p-4 text-center text-sm text-gray-500">Keine Einträge gefunden</div>
                      )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="border-t border-gray-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="text-xs text-gray-700">
                          Zeige {startIndex + 1} bis {Math.min(startIndex + PAGE_SIZE, filteredItems.length)} von{' '}
                          {filteredItems.length} Einträgen
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Zurück
                          </button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                              if (page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1) {
                                return (
                                  <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`px-3 py-1 text-xs rounded-lg ${
                                      currentPage === page ? 'bg-primary text-white' : 'border border-gray-300 hover:bg-gray-50'
                                    }`}
                                  >
                                    {page}
                                  </button>
                                );
                              }
                              if (Math.abs(page - currentPage) === 2) {
                                return (
                                  <span key={page} className="px-2 text-gray-400">
                                    ...
                                  </span>
                                );
                              }
                              return null;
                            })}
                          </div>
                          <button
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Weiter
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>

            {/* Detail & Aktionen - Desktop */}
            <section className="hidden lg:flex w-full lg:w-[28rem] shrink-0 flex-col gap-4">{renderDetailCards()}</section>
          </div>
        </div>
      </div>

      {/* Mobile Detail-Panel (Slide-up Modal) */}
      {showMobileDetail && selectedItem && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMobileDetail(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[90vh] bg-white rounded-t-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
              <div className="flex items-center gap-2 min-w-0">
                <Package className="w-5 h-5 text-primary-dark shrink-0" />
                <span className="font-semibold text-primary-dark">{selectedItem.inventarNr || '—'}</span>
                <span className="font-medium text-gray-900 truncate">{selectedItem.bezeichnung}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileDetail(false)}
                className="p-2 -mr-2 rounded-full hover:bg-gray-100 active:bg-gray-200"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 flex flex-col gap-4">{renderDetailCards()}</div>
          </div>
        </div>
      )}
    </div>
  );
}
