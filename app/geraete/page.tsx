'use client';

import { useEffect, useMemo, useState } from 'react';
import { Database, MonitorSmartphone, UserRound, History, AlertTriangle, Plus, RefreshCw, Package, Undo2, XCircle } from 'lucide-react';

interface DeviceListItem {
  id: number;
  sno: string;
  zugang: string;
  abgang: string | null;
  hwName: string | null;
  hsName: string | null;
  modelName: string | null;
  preis: number | null;
  ean: string | null;
  imei1: string | null;
  imei2: string | null;
  test: number | null;
  testGruppe: number | null;
  currentUserId: number | null;
  currentUserName: string | null;
}

interface HistoryEntry {
  id: number;
  benutzerId: number;
  benutzerName: string | null;
  start: string;
  ende: string | null;
}

interface UserOption {
  id: number;
  name: string;
}

interface HsModRelation {
  HSID: number;
  ModID: number;
  HWID: number | null;
}

interface DeviceAccessory {
  id: number;
  accessoryId: number;
  accessoryLabel: string;
  accessoryType: string | null;
  userId: number | null;
  userName: string | null;
  start: string | null;
  end: string | null;
  status: 'ACTIVE' | 'RETURNED';
}

interface AccessoryOption {
  id: number;
  label: string;
  stock: number;
}

export default function DeviceManagementPage() {
  const [devices, setDevices] = useState<DeviceListItem[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [devicesError, setDevicesError] = useState<string | null>(null);

  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [hwOptions, setHwOptions] = useState<UserOption[]>([]);
  const [hsOptions, setHsOptions] = useState<UserOption[]>([]);
  const [modOptions, setModOptions] = useState<UserOption[]>([]);
  const [hsModRelations, setHsModRelations] = useState<HsModRelation[]>([]);

  const [hwFilter, setHwFilter] = useState('');
  const [hsFilter, setHsFilter] = useState('');
  const [modFilter, setModFilter] = useState('');

  const [deviceSearch, setDeviceSearch] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'retired'>('all');
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);

  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [assignUserId, setAssignUserId] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Zubehör-State
  const [deviceAccessories, setDeviceAccessories] = useState<DeviceAccessory[]>([]);
  const [accessoriesLoading, setAccessoriesLoading] = useState(false);
  const [accessoryOptions, setAccessoryOptions] = useState<AccessoryOption[]>([]);
  const [selectedAccessoryId, setSelectedAccessoryId] = useState<string>('');
  const [accessoryActionLoading, setAccessoryActionLoading] = useState(false);

  const [newDevice, setNewDevice] = useState({
    HWID: '',
    HSID: '',
    MODID: '',
    SNO: '',
    Preis: '',
    Zugang: '',
  });

  useEffect(() => {
    fetchDevices();
    fetchUsers();
    fetchHardwareTypes();
    fetchManufacturers();
    fetchModels();
    fetchHsModRelations();
  }, []);

  useEffect(() => {
    if (selectedDeviceId != null) {
      fetchHistory(selectedDeviceId);
      fetchDeviceAccessories(selectedDeviceId);
      fetchCompatibleAccessories(selectedDeviceId);
    } else {
      setHistory([]);
      setDeviceAccessories([]);
      setAccessoryOptions([]);
    }
  }, [selectedDeviceId]);

  const fetchDevices = async () => {
    try {
      setLoadingDevices(true);
      const res = await fetch('/api/devices');
      if (!res.ok) throw new Error('Fehler beim Laden der Geräte');
      const data: DeviceListItem[] = await res.json();
      setDevices(data);
      setDevicesError(null);
      if (data.length > 0 && selectedDeviceId == null) {
        setSelectedDeviceId(data[0].id);
      }
    } catch (err) {
      setDevicesError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoadingDevices(false);
    }
  };

  const fetchHsModRelations = async () => {
    try {
      const res = await fetch('/api/tables/HS_MOD');
      if (!res.ok) throw new Error('Fehler beim Laden der Zuordnungen');
      const json = await res.json();
      const relations: HsModRelation[] = (json.data as any[]).map((row: any) => ({
        HSID: Number(row.HSID),
        ModID: Number(row.ModID),
        HWID: row.HWID === null || row.HWID === undefined ? null : Number(row.HWID),
      }));
      setHsModRelations(relations);
    } catch {
      setHsModRelations([]);
    }
  };

  const fetchCompatibleAccessories = async (deviceId: number) => {
    try {
      const res = await fetch(`/api/devices/${deviceId}/compatible-accessories`);
      if (!res.ok) return;
      const json = await res.json();
      const options: AccessoryOption[] = (json.accessories ?? []).map((a: any) => ({
        id: a.id,
        label: a.label || `Zubehör #${a.id}`,
        stock: a.stock ?? 0,
      }));
      setAccessoryOptions(options);
    } catch {
      setAccessoryOptions([]);
    }
  };

  const fetchDeviceAccessories = async (deviceId: number) => {
    try {
      setAccessoriesLoading(true);
      const res = await fetch(`/api/devices/${deviceId}/accessories`);
      if (!res.ok) throw new Error('Fehler beim Laden des Zubehörs');
      const json = await res.json();
      setDeviceAccessories(json.accessories ?? []);
    } catch {
      setDeviceAccessories([]);
    } finally {
      setAccessoriesLoading(false);
    }
  };

  const handleAssignAccessory = async () => {
    if (!selectedDeviceId || !selectedAccessoryId) return;
    try {
      setAccessoryActionLoading(true);
      setActionError(null);
      const res = await fetch(`/api/devices/${selectedDeviceId}/accessories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ZubehoerID: Number(selectedAccessoryId) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Fehler beim Zuweisen');
      setSelectedAccessoryId('');
      fetchDeviceAccessories(selectedDeviceId);
      fetchCompatibleAccessories(selectedDeviceId); // Bestand aktualisieren
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Fehler beim Zuweisen');
    } finally {
      setAccessoryActionLoading(false);
    }
  };

  const handleReturnAccessory = async (assignmentId: number, returnToStock: boolean) => {
    if (!selectedDeviceId) return;
    try {
      setAccessoryActionLoading(true);
      setActionError(null);
      const res = await fetch(`/api/devices/${selectedDeviceId}/accessories/${assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnToStock }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Fehler bei Rückgabe');
      fetchDeviceAccessories(selectedDeviceId);
      if (returnToStock) fetchCompatibleAccessories(selectedDeviceId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Fehler bei Rückgabe');
    } finally {
      setAccessoryActionLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch('/api/tables/Benutzer');
      if (!res.ok) throw new Error('Fehler beim Laden der Benutzer');
      const json = await res.json();
      const options: UserOption[] = (json.data as any[]).map((row) => ({
        id: row.BenutzerID,
        name: row.BenutzerName || `Benutzer ${row.BenutzerID}`,
      }));
      setUsers(options);
    } catch {
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchHardwareTypes = async () => {
    try {
      const res = await fetch('/api/tables/HW');
      if (!res.ok) throw new Error('Fehler beim Laden der Hardware-Typen');
      const json = await res.json();
      const options: UserOption[] = (json.data as any[]).map((row: any) => ({
        id: row.HWID,
        name: row.HWName || `Typ ${row.HWID}`,
      }));
      setHwOptions(options);
    } catch {
      setHwOptions([]);
    }
  };

  const fetchManufacturers = async () => {
    try {
      const res = await fetch('/api/tables/HS');
      if (!res.ok) throw new Error('Fehler beim Laden der Hersteller');
      const json = await res.json();
      const options: UserOption[] = (json.data as any[]).map((row: any) => ({
        id: row.HSID,
        name: row.HSName || `Hersteller ${row.HSID}`,
      }));
      setHsOptions(options);
    } catch {
      setHsOptions([]);
    }
  };

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/tables/MOD');
      if (!res.ok) throw new Error('Fehler beim Laden der Modelle');
      const json = await res.json();
      const options: UserOption[] = (json.data as any[]).map((row: any) => {
        const parts = [row.ModName, row.ModellNummer].filter(Boolean);
        const label = parts.join(' · ') || `Modell ${row.ModID}`;
        return {
          id: row.ModID,
          name: label,
        };
      });
      setModOptions(options);
    } catch {
      setModOptions([]);
    }
  };

  const fetchHistory = async (deviceId: number) => {
    try {
      setHistoryLoading(true);
      const res = await fetch(`/api/devices/${deviceId}/history`);
      if (!res.ok) throw new Error('Fehler beim Laden des Verlaufs');
      const data: HistoryEntry[] = await res.json();
      setHistory(data);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedDeviceId) return;
    const userIdNum = Number(assignUserId);
    if (!userIdNum || Number.isNaN(userIdNum)) {
      setActionError('Bitte einen gültigen Benutzer auswählen');
      return;
    }
    setActionError(null);

    try {
      const res = await fetch(`/api/devices/${selectedDeviceId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ benutzerId: userIdNum }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Zuweisen');
      }
      await fetchDevices();
      await fetchHistory(selectedDeviceId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Fehler beim Zuweisen');
    }
  };

  const handleUnassign = async () => {
    if (!selectedDeviceId) return;
    setActionError(null);

    try {
      const res = await fetch(`/api/devices/${selectedDeviceId}/unassign`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Entfernen der Zuordnung');
      }
      await fetchDevices();
      await fetchHistory(selectedDeviceId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Fehler beim Entfernen der Zuordnung');
    }
  };

  const handleRetire = async () => {
    if (!selectedDeviceId) return;
    setActionError(null);

    try {
      const res = await fetch(`/api/devices/${selectedDeviceId}/retire`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Ausbuchen des Geräts');
      }
      await fetchDevices();
      await fetchHistory(selectedDeviceId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Fehler beim Ausbuchen des Geräts');
    }
  };

  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setActionError(null);

    try {
      const payload = {
        HWID: Number(newDevice.HWID) || null,
        HSID: Number(newDevice.HSID) || null,
        MODID: Number(newDevice.MODID) || null,
        SNO: newDevice.SNO || null,
        Preis: newDevice.Preis ? Number(newDevice.Preis) : null,
        Zugang: newDevice.Zugang || null,
      };

      const res = await fetch('/api/tables/GER', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.details || data.error || 'Fehler beim Erstellen des Geräts');
      }

      setNewDevice({ HWID: '', HSID: '', MODID: '', SNO: '', Preis: '', Zugang: '' });
      await fetchDevices();
      setCreating(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Fehler beim Erstellen des Geräts');
    } finally {
      setSaving(false);
    }
  };

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) || null;

  const filteredDevices = devices.filter((d) => {
    if (filterUserId) {
      const userIdNum = Number(filterUserId);
      if (!Number.isNaN(userIdNum) && d.currentUserId !== userIdNum) {
        return false;
      }
    }

    if (showUnassignedOnly) {
      // Nur aktive Geräte ohne aktuelle Zuordnung
      if (d.currentUserId !== null || d.abgang) {
        return false;
      }
    }

    if (statusFilter === 'active' && d.abgang) {
      return false;
    }
    if (statusFilter === 'retired' && !d.abgang) {
      return false;
    }

    if (deviceSearch) {
      const term = deviceSearch.toLowerCase();
      const haystack = [
        d.sno,
        d.hwName,
        d.hsName,
        d.modelName,
        d.currentUserName,
        d.ean,
        d.imei1,
        d.imei2,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!haystack.includes(term)) {
        return false;
      }
    }

    return true;
  });

  const selectedHwId = newDevice.HWID ? Number(newDevice.HWID) : null;
  const selectedHsId = newDevice.HSID ? Number(newDevice.HSID) : null;
  const selectedModId = newDevice.MODID ? Number(newDevice.MODID) : null;

  const relationSets = useMemo(() => {
    const allowedHwIds = new Set<number>();
    const allowedHsIds = new Set<number>();
    const allowedModIds = new Set<number>();

    if (hsModRelations.length === 0) {
      return { allowedHwIds, allowedHsIds, allowedModIds };
    }

    hsModRelations.forEach((rel) => {
      if (
        (!selectedHsId && !selectedModId) ||
        ((!selectedHsId || rel.HSID === selectedHsId) && (!selectedModId || rel.ModID === selectedModId))
      ) {
        if (rel.HWID != null) {
          allowedHwIds.add(rel.HWID);
        }
      }

      if (
        (!selectedHwId && !selectedModId) ||
        ((!selectedHwId || rel.HWID === selectedHwId) && (!selectedModId || rel.ModID === selectedModId))
      ) {
        allowedHsIds.add(rel.HSID);
      }

      if (
        (!selectedHwId && !selectedHsId) ||
        ((!selectedHwId || rel.HWID === selectedHwId) && (!selectedHsId || rel.HSID === selectedHsId))
      ) {
        allowedModIds.add(rel.ModID);
      }
    });

    return { allowedHwIds, allowedHsIds, allowedModIds };
  }, [hsModRelations, selectedHwId, selectedHsId, selectedModId]);

  const canFilterByRelations = hsModRelations.length > 0;
  const shouldRestrictHw = canFilterByRelations && (selectedHsId != null || selectedModId != null);
  const shouldRestrictHs = canFilterByRelations && (selectedHwId != null || selectedModId != null);
  const shouldRestrictMod = canFilterByRelations && (selectedHwId != null || selectedHsId != null);

  const optionMatchesSearch = (name: string, id: number, term: string) => {
    if (!term) return true;
    const lower = term.toLowerCase();
    return name.toLowerCase().includes(lower) || String(id).includes(lower);
  };

  const filteredHwOptions = hwOptions.filter((o) => {
    if (!optionMatchesSearch(o.name, o.id, hwFilter)) {
      return false;
    }
    if (!shouldRestrictHw) {
      return true;
    }
    if (relationSets.allowedHwIds.size === 0) {
      return false;
    }
    return relationSets.allowedHwIds.has(o.id);
  });

  const filteredHsOptions = hsOptions.filter((o) => {
    if (!optionMatchesSearch(o.name, o.id, hsFilter)) {
      return false;
    }
    if (!shouldRestrictHs) {
      return true;
    }
    if (relationSets.allowedHsIds.size === 0) {
      return false;
    }
    return relationSets.allowedHsIds.has(o.id);
  });

  const filteredModOptions = modOptions.filter((o) => {
    if (!optionMatchesSearch(o.name, o.id, modFilter)) {
      return false;
    }
    if (!shouldRestrictMod) {
      return true;
    }
    if (relationSets.allowedModIds.size === 0) {
      return false;
    }
    return relationSets.allowedModIds.has(o.id);
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Seitenkopf */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-sm">
              <MonitorSmartphone className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-semibold text-gray-900">Geräteverwaltung</h1>
              <p className="text-xs text-gray-500">Geräte anlegen, zuweisen und Verlauf einsehen</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
            <Database className="w-4 h-4" />
            <span>Prisma · SQLite</span>
          </div>
        </div>
      </header>

      {/* Inhalt */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
          {/* Geräte-Liste, Filter & Neuanlage */}
          <section className="flex-1 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <MonitorSmartphone className="w-4 h-4 text-blue-600" />
                Geräte
              </h2>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-blue-600 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                onClick={() => setCreating((prev) => !prev)}
              >
                <Plus className="w-3 h-3" />
                Neues Gerät
              </button>
            </div>

            {creating && (
              <form onSubmit={handleCreateDevice} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Hardware-Typ</label>
                    <div className="space-y-1">
                      <input
                        type="text"
                        placeholder="Hardware-Typ suchen..."
                        value={hwFilter}
                        onChange={(e) => setHwFilter(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={newDevice.HWID}
                        onChange={(e) => setNewDevice((prev) => ({ ...prev, HWID: e.target.value }))}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">-- Hardware-Typ wählen --</option>
                        {filteredHwOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name} (ID {opt.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Hersteller</label>
                    <div className="space-y-1">
                      <input
                        type="text"
                        placeholder="Hersteller suchen..."
                        value={hsFilter}
                        onChange={(e) => setHsFilter(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={newDevice.HSID}
                        onChange={(e) => setNewDevice((prev) => ({ ...prev, HSID: e.target.value }))}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">-- Hersteller wählen --</option>
                        {filteredHsOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name} (ID {opt.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Modell</label>
                    <div className="space-y-1">
                      <input
                        type="text"
                        placeholder="Modell suchen..."
                        value={modFilter}
                        onChange={(e) => setModFilter(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={newDevice.MODID}
                        onChange={(e) => setNewDevice((prev) => ({ ...prev, MODID: e.target.value }))}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">-- Modell wählen --</option>
                        {filteredModOptions.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name} (ID {opt.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Seriennummer (SNO)</label>
                    <input
                      type="text"
                      value={newDevice.SNO}
                      onChange={(e) => setNewDevice((prev) => ({ ...prev, SNO: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Preis (optional)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newDevice.Preis}
                      onChange={(e) => setNewDevice((prev) => ({ ...prev, Preis: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Zugang (Datum)</label>
                    <input
                      type="date"
                      value={newDevice.Zugang}
                      onChange={(e) => setNewDevice((prev) => ({ ...prev, Zugang: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

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
                    className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                    disabled={saving}
                  >
                    Speichern
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col sm:flex-row gap-3 text-xs">
              <div className="flex-1 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Suchen (SNO, EAN, IMEI, Typ, Modell, Benutzer)..."
                  value={deviceSearch}
                  onChange={(e) => setDeviceSearch(e.target.value)}
                  className="w-full sm:flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={filterUserId}
                  onChange={(e) => setFilterUserId(e.target.value)}
                  className="w-full sm:w-56 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Alle Benutzer</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} (ID {u.id})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'retired')}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Alle Status</option>
                  <option value="active">Nur aktive</option>
                  <option value="retired">Nur ausgebuchte</option>
                </select>

              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 text-xs text-gray-500">
                <span>
                  {filteredDevices.length} Geräte
                  {devices.length !== filteredDevices.length && (
                    <span className="text-gray-400"> von {devices.length} gesamt</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={fetchDevices}
                  className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800"
                >
                  <RefreshCw className="w-3 h-3" />
                  Aktualisieren
                </button>
              </div>

              {loadingDevices ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                </div>
              ) : devicesError ? (
                <div className="p-4 text-sm text-red-600">{devicesError}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">SNO</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Typ</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Hersteller</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Modell</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Status</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-600">Benutzer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredDevices.map((d) => {
                        const isSelected = d.id === selectedDeviceId;
                        const active = !d.abgang;
                        return (
                          <tr
                            key={d.id}
                            className={`cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-blue-50/60' : ''}`}
                            onClick={() => setSelectedDeviceId(d.id)}
                          >
                            <td className="px-3 py-2 text-gray-800 font-medium">{d.sno}</td>
                            <td className="px-3 py-2 text-gray-700">{d.hwName || '-'}</td>
                            <td className="px-3 py-2 text-gray-700">{d.hsName || '-'}</td>
                            <td className="px-3 py-2 text-gray-700">{d.modelName || '-'}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                  active
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                {active ? 'Aktiv' : 'Ausgebucht'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-700">{d.currentUserName || '-'}</td>
                          </tr>
                        );
                      })}
                      {devices.length === 0 && (
                        <tr>
                          <td className="px-3 py-4 text-center text-gray-500" colSpan={6}>
                            Keine Geräte vorhanden
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Detail & Aktionen */}
          <section className="w-full lg:w-80 xl:w-96 flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <UserRound className="w-4 h-4 text-blue-600" />
                Zuordnung & Status
              </h2>

              {selectedDevice ? (
                <>
                  <div className="mb-3 text-xs text-gray-700">
                    <div className="font-medium text-gray-900 mb-1">{selectedDevice.sno}</div>
                    <div>{selectedDevice.hwName || '-'}</div>
                    <div>{selectedDevice.hsName || '-'}</div>
                    <div>{selectedDevice.modelName || '-'}</div>
                  </div>

                  <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] text-gray-600">
                    <div>
                      <div className="text-gray-500">Zugang</div>
                      <div className="font-medium text-gray-900">
                        {selectedDevice.zugang
                          ? new Date(selectedDevice.zugang).toLocaleDateString('de-DE')
                          : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Abgang</div>
                      <div className="font-medium text-gray-900">
                        {selectedDevice.abgang
                          ? new Date(selectedDevice.abgang).toLocaleDateString('de-DE')
                          : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Preis</div>
                      <div className="font-medium text-gray-900">
                        {(selectedDevice as any).preis != null
                          ? Number((selectedDevice as any).preis).toLocaleString('de-DE', {
                              style: 'currency',
                              currency: 'EUR',
                            })
                          : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">EAN</div>
                      <div className="font-medium text-gray-900 truncate">
                        {(selectedDevice as any).ean || '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">IMEI 1</div>
                      <div className="font-medium text-gray-900 truncate">
                        {(selectedDevice as any).imei1 || '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">IMEI 2</div>
                      <div className="font-medium text-gray-900 truncate">
                        {(selectedDevice as any).imei2 || '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Test</div>
                      <div className="font-medium text-gray-900">
                        {(selectedDevice as any).test ?? '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Testgruppe</div>
                      <div className="font-medium text-gray-900">
                        {(selectedDevice as any).testGruppe ?? '—'}
                      </div>
                    </div>
                  </div>

                  <div className="mb-3 text-xs text-gray-700 space-y-1">
                    <div>
                      <span className="text-gray-500 mr-1">Status:</span>
                      <span className={selectedDevice.abgang ? 'text-gray-600' : 'text-emerald-600 font-medium'}>
                        {selectedDevice.abgang ? 'Ausgebucht' : 'Aktiv'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 mr-1">Aktueller Benutzer:</span>
                      <span className="font-medium">
                        {selectedDevice.currentUserName || '— keiner —'}
                      </span>
                    </div>
                  </div>

                  {!loadingUsers && (
                    <div className="mb-3 text-xs space-y-2">
                      <label className="block text-xs font-medium text-gray-700">Benutzer zuweisen</label>
                      <select
                        value={assignUserId}
                        onChange={(e) => setAssignUserId(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Benutzer wählen --</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} (ID {u.id})
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleAssign}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700"
                        >
                          Zuweisen
                        </button>
                        <button
                          type="button"
                          onClick={handleUnassign}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-xs hover:bg-gray-50"
                        >
                          Zuordnung entfernen
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-gray-100 pt-3 mt-2">
                    <button
                      type="button"
                      onClick={handleRetire}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 text-xs text-red-700 hover:bg-red-100"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      Gerät ausbuchen / defekt
                    </button>
                  </div>

                  {actionError && (
                    <div className="mt-3 text-[11px] text-red-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {actionError}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-gray-500">Bitte wähle links ein Gerät aus.</p>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 flex-1 flex flex-col">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-blue-600" />
                Verlauf
              </h2>

              {selectedDevice ? (
                historyLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-xs text-gray-500">Für dieses Gerät sind noch keine Zuordnungen vorhanden.</p>
                ) : (
                  <ul className="space-y-2 text-xs text-gray-700 overflow-y-auto max-h-72 pr-1">
                    {history.map((entry) => (
                      <li
                        key={entry.id}
                        className="rounded-lg border border-gray-200 px-3 py-2 bg-gray-50/60"
                      >
                        <div className="font-medium text-gray-900 mb-0.5">
                          {entry.benutzerName || `Benutzer ${entry.benutzerId}`}
                        </div>
                        <div className="text-[11px] text-gray-600">
                          <span className="mr-1">von</span>
                          {new Date(entry.start).toLocaleDateString('de-DE')}
                          <span className="mx-1">bis</span>
                          {entry.ende
                            ? new Date(entry.ende).toLocaleDateString('de-DE')
                            : 'heute'}
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <p className="text-xs text-gray-500">Wähle links ein Gerät, um den Verlauf zu sehen.</p>
              )}
            </div>

            {/* Zubehör-Sektion */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-blue-600" />
                Zubehör
              </h2>

              {selectedDevice ? (
                <>
                  {/* Zubehör zuweisen */}
                  <div className="mb-3 text-xs space-y-2">
                    <label className="block text-xs font-medium text-gray-700">Zubehör aus Lager zuweisen</label>
                    <select
                      value={selectedAccessoryId}
                      onChange={(e) => setSelectedAccessoryId(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Zubehör wählen --</option>
                      {accessoryOptions
                        .filter((opt) => opt.stock > 0)
                        .map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label} (Bestand: {opt.stock})
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAssignAccessory}
                      disabled={!selectedAccessoryId || accessoryActionLoading}
                      className="w-full px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                    >
                      {accessoryActionLoading ? 'Wird zugewiesen...' : 'Zuweisen & vom Lager abbuchen'}
                    </button>
                  </div>

                  {/* Zugewiesenes Zubehör */}
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">Zugewiesenes Zubehör</p>
                    {accessoriesLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                      </div>
                    ) : deviceAccessories.filter((a) => a.status === 'ACTIVE').length === 0 ? (
                      <p className="text-[11px] text-gray-500">Kein Zubehör zugewiesen.</p>
                    ) : (
                      <ul className="space-y-2 text-xs text-gray-700 max-h-48 overflow-y-auto pr-1">
                        {deviceAccessories
                          .filter((a) => a.status === 'ACTIVE')
                          .map((acc) => (
                            <li
                              key={acc.id}
                              className="rounded-lg border border-gray-200 px-3 py-2 bg-gray-50/60 flex items-center justify-between gap-2"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900">{acc.accessoryLabel}</div>
                                {acc.accessoryType && (
                                  <div className="text-[11px] text-gray-500">{acc.accessoryType}</div>
                                )}
                                <div className="text-[11px] text-gray-500">
                                  seit {acc.start ? new Date(acc.start).toLocaleDateString('de-DE') : '—'}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleReturnAccessory(acc.id, true)}
                                  disabled={accessoryActionLoading}
                                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 disabled:opacity-50"
                                  title="Zurückgeben (ins Lager)"
                                >
                                  <Undo2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReturnAccessory(acc.id, false)}
                                  disabled={accessoryActionLoading}
                                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50"
                                  title="Ausbuchen / Defekt (nicht ins Lager)"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>

                  {/* Zubehör-Historie (beendet) */}
                  {deviceAccessories.filter((a) => a.status === 'RETURNED').length > 0 && (
                    <div className="border-t border-gray-100 pt-3 mt-3">
                      <p className="text-xs font-medium text-gray-700 mb-2">Zubehör-Historie</p>
                      <ul className="space-y-1 text-[11px] text-gray-500 max-h-32 overflow-y-auto pr-1">
                        {deviceAccessories
                          .filter((a) => a.status === 'RETURNED')
                          .map((acc) => (
                            <li key={acc.id} className="flex justify-between">
                              <span>{acc.accessoryLabel}</span>
                              <span>
                                {acc.start ? new Date(acc.start).toLocaleDateString('de-DE') : '?'} –{' '}
                                {acc.end ? new Date(acc.end).toLocaleDateString('de-DE') : '?'}
                              </span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-gray-500">Wähle links ein Gerät, um Zubehör zu verwalten.</p>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
