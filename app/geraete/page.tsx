'use client';

import { useEffect, useMemo, useState, KeyboardEvent } from 'react';
import Link from 'next/link';
import { Database, MonitorSmartphone, UserRound, History, AlertTriangle, Plus, RefreshCw, Package, Undo2, XCircle, X, ChevronRight, QrCode, MapPin, ClipboardList, ArrowUpRight, ArrowDownLeft, Repeat, FileText, User, Calendar, CheckCircle2, Clock, FileEdit, Archive, Edit2 } from 'lucide-react';
import StickerModal from '../components/StickerModal';

interface DeviceListItem {
  id: number;
  inventarCode: string;
  sno: string;
  zugang: string;
  abgang: string | null;
  hwId: number | null;
  hwName: string | null;
  hwCode: string | null;
  hsId: number | null;
  hsName: string | null;
  modelId: number | null;
  modelName: string | null;
  preis: number | null;
  ean: string | null;
  imei1: string | null;
  imei2: string | null;
  currentUserId: number | null;
  currentUserName: string | null;
  raumId: number | null;
  raumName: string | null;
  raumStandort: string | null;
  raumNotiz: string | null;
  raumBranch: string | null;
  raumBranchCity: string | null;
  raumHazards: { id: number; name: string }[];
  effectiveRoom: string | null;
  effectiveRoomSource: 'user' | 'device' | null;
}

interface HistoryEntry {
  id: number;
  benutzerId: number;
  benutzerName: string | null;
  start: string;
  ende: string | null;
  roomId: number | null;
  roomName: string | null;
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

interface ProtocolPreviewItem {
  id: number;
  protokollNr: string;
  typ: string;
  status: string;
  erstelltAm: string;
  benutzerName: string | null;
  erstellerName: string | null;
}

interface ProtocolDetailPreview extends ProtocolPreviewItem {
  bemerkung?: string | null;
  unterschriftDatum?: string | null;
  positionen?: {
    id: number;
    geraet?: { inventarCode: string; sno?: string | null } | null;
    zubehoer?: { typ: string | null; modell?: string | null } | null;
    zustand?: string | null;
    zustandNotiz?: string | null;
  }[];
  benutzer?: {
    name?: string | null;
    abteilung?: string | null;
  } | null;
}

interface AccessoryOption {
  id: number;
  label: string;
  stock: number;
}

interface RoomOption {
  id: number;
  name: string;
  standort: string | null;
  branch: string | null;
  branchCity: string | null;
  hazards: string[];
  notiz: string | null;
}

interface CurrentUser {
  id: number;
  email: string;
  name: string;
  role: string;
  permissions: string[];
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

  // Mobile Detail-Panel
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  // Zubehör-State
  const [deviceAccessories, setDeviceAccessories] = useState<DeviceAccessory[]>([]);
  const [accessoriesLoading, setAccessoriesLoading] = useState(false);
  const [accessoryOptions, setAccessoryOptions] = useState<AccessoryOption[]>([]);
  const [selectedAccessoryId, setSelectedAccessoryId] = useState<string>('');
  const [accessoryActionLoading, setAccessoryActionLoading] = useState(false);

  // Protokolle
  const [deviceProtocols, setDeviceProtocols] = useState<ProtocolPreviewItem[]>([]);
  const [protocolsLoading, setProtocolsLoading] = useState(false);
  const [selectedProtocolId, setSelectedProtocolId] = useState<number | null>(null);
  const [protocolDetailLoading, setProtocolDetailLoading] = useState(false);
  const [selectedProtocolDetail, setSelectedProtocolDetail] = useState<ProtocolDetailPreview | null>(null);
  const [protocolError, setProtocolError] = useState<string | null>(null);

  // Raum-Stammdaten
  const [roomOptions, setRoomOptions] = useState<RoomOption[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomActionLoading, setRoomActionLoading] = useState(false);
  const [roomActionError, setRoomActionError] = useState<string | null>(null);
  const [roomActionSuccess, setRoomActionSuccess] = useState<string | null>(null);
  const [roomSelectValue, setRoomSelectValue] = useState<string>('');

  // Berechtigungen
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const canEditDevices = currentUser?.permissions?.includes('devices:edit') || currentUser?.role === 'ADMIN';
  const canCreateDevices = currentUser?.permissions?.includes('devices:create') || currentUser?.role === 'ADMIN';
  const canEditAccessories = currentUser?.permissions?.includes('accessories:edit') || currentUser?.role === 'ADMIN';
  const canViewProtocols = currentUser?.permissions?.includes('protocols:view') || currentUser?.role === 'ADMIN';

  // Sticker Modal
  const [showStickerModal, setShowStickerModal] = useState(false);

  // Retire Modal mit Zubehör-Verwaltung
  const [showRetireModal, setShowRetireModal] = useState(false);
  const [retireAccessoryActions, setRetireAccessoryActions] = useState<Record<number, 'retire' | 'return'>>({});

  // Nicht zugewiesene Geräte Sektion
  const [showUnassignedSection, setShowUnassignedSection] = useState(false);

  // Unassign Modal mit Raumauswahl
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [unassignTargetRoomId, setUnassignTargetRoomId] = useState<string>('');
  const [roomsWithUsers, setRoomsWithUsers] = useState<Array<{id: number; name: string; users: string[]; standort: string}>>([]);
  const [roomsWithUsersLoading, setRoomsWithUsersLoading] = useState(false);

  // Edit Mode für Gerätedaten
  const [isEditingDevice, setIsEditingDevice] = useState(false);
  const [editDeviceData, setEditDeviceData] = useState({
    SNO: '',
    EAN: '',
    IMEI1: '',
    IMEI2: '',
    Preis: '',
    HWID: '',
    HSID: '',
    MODID: '',
  });
  const [editDeviceLoading, setEditDeviceLoading] = useState(false);
  const [editDeviceError, setEditDeviceError] = useState<string | null>(null);

  const [newDevice, setNewDevice] = useState({
    HWID: '',
    HSID: '',
    MODID: '',
    SNO: '',
    Preis: '',
    Zugang: '',
    EAN: '',
    IMEI1: '',
    IMEI2: '',
  });

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getProtocolTypeLabel = (typ: string) => {
    switch (typ) {
      case 'AUSGABE':
        return 'Geräteausgabe';
      case 'RUECKGABE':
        return 'Geräterückgabe';
      case 'TAUSCH':
        return 'Gerätetausch';
      default:
        return typ;
    }
  };

  const renderProtocolStatusBadge = (status: string) => {
    switch (status) {
      case 'UNTERSCHRIEBEN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Signiert
          </span>
        );
      case 'OFFEN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700">
            <Clock className="w-3.5 h-3.5" />
            Offen
          </span>
        );
      case 'ENTWURF':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
            <FileEdit className="w-3.5 h-3.5" />
            Entwurf
          </span>
        );
      case 'ARCHIVIERT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700">
            <Archive className="w-3.5 h-3.5" />
            Archiviert
          </span>
        );
      default:
        return <span className="text-[11px] font-medium text-gray-600">{status}</span>;
    }
  };

  const renderProtocolTypeIcon = (typ: string) => {
    switch (typ) {
      case 'AUSGABE':
        return <ArrowUpRight className="w-4 h-4 text-emerald-600" />;
      case 'RUECKGABE':
        return <ArrowDownLeft className="w-4 h-4 text-amber-600" />;
      case 'TAUSCH':
        return <Repeat className="w-4 h-4 text-blue-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchDevices();
    fetchUsers();
    fetchHardwareTypes();
    fetchManufacturers();
    fetchModels();
    fetchHsModRelations();
    fetchRooms();
    fetchRoomsWithUsers();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      }
    } catch {
      setCurrentUser(null);
    }
  };

  const fetchProtocolDetail = async (protocolId: number) => {
    try {
      setProtocolDetailLoading(true);
      setProtocolError(null);
      const res = await fetch(`/api/protocols/${protocolId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Fehler beim Laden des Protokolls');
      const data = await res.json();
      setSelectedProtocolDetail(data);
    } catch (err) {
      console.error('Fehler beim Laden des Protokolls', err);
      setProtocolError('Protokolldetails konnten nicht geladen werden.');
      setSelectedProtocolDetail(null);
    } finally {
      setProtocolDetailLoading(false);
    }
  };

  const fetchDeviceProtocols = async (deviceId: number) => {
    try {
      setProtocolsLoading(true);
      setProtocolError(null);
      const res = await fetch(`/api/devices/${deviceId}/protocols`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Fehler beim Laden der Protokolle');
      const json = await res.json();
      const list = Array.isArray(json) ? json : json?.protocols ?? [];
      setDeviceProtocols(list);
      if (list.length > 0) {
        setSelectedProtocolId(list[0].id);
        fetchProtocolDetail(list[0].id);
      } else {
        setSelectedProtocolId(null);
        setSelectedProtocolDetail(null);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Protokolle', err);
      setProtocolError('Protokolle konnten nicht geladen werden.');
      setDeviceProtocols([]);
      setSelectedProtocolId(null);
      setSelectedProtocolDetail(null);
    } finally {
      setProtocolsLoading(false);
    }
  };

  const handleChangeRoom = async () => {
    if (!selectedDeviceId) return;
    setRoomActionError(null);
    setRoomActionLoading(true);
    try {
      const res = await fetch(`/api/devices/${selectedDeviceId}/room`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raumId: roomSelectValue ? Number(roomSelectValue) : null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Fehler beim Speichern der Raumzuweisung');
      }
      await fetchDevices();
    } catch (err) {
      setRoomActionError(err instanceof Error ? err.message : 'Fehler beim Speichern der Raumzuweisung');
    } finally {
      setRoomActionLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      setRoomsLoading(true);
      const res = await fetch('/api/rooms');
      if (!res.ok) throw new Error('Fehler beim Laden der Räume');
      const json = await res.json();
      const options: RoomOption[] = (json.rooms as any[]).map((room: any) => ({
        id: room.RaumID,
        name: room.RaumName || `Raum ${room.RaumID}`,
        standort: room.Standort || null,
        branch: room.GS?.GSName ?? null,
        branchCity: room.GS?.GSOrt ?? null,
        hazards:
          (room.RaumGefahrenstellen ?? [])
            .map((rg: any) => rg.Gefahrenstelle?.Name)
            .filter(Boolean) ?? [],
        notiz: room.Notiz ?? null,
      }));
      setRoomOptions(options);
    } catch {
      setRoomOptions([]);
    } finally {
      setRoomsLoading(false);
    }
  };

  const fetchRoomsWithUsers = async () => {
    setRoomsWithUsersLoading(true);
    try {
      const res = await fetch('/api/rooms/with-users');
      if (!res.ok) throw new Error('Fehler beim Laden der Räume');
      const data = await res.json();
      setRoomsWithUsers(data.rooms || []);
    } catch (err) {
      console.error('Fehler beim Laden der Räume:', err);
    } finally {
      setRoomsWithUsersLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDeviceId != null) {
      fetchHistory(selectedDeviceId);
      fetchDeviceAccessories(selectedDeviceId);
      fetchCompatibleAccessories(selectedDeviceId);
      if (canViewProtocols) {
        fetchDeviceProtocols(selectedDeviceId);
      } else {
        setDeviceProtocols([]);
      }
      const current = devices.find((d) => d.id === selectedDeviceId);
      setRoomSelectValue(current?.raumId?.toString() || '');
    } else {
      setHistory([]);
      setDeviceAccessories([]);
      setAccessoryOptions([]);
      setDeviceProtocols([]);
      setSelectedProtocolId(null);
      setSelectedProtocolDetail(null);
      setRoomSelectValue('');
    }
  }, [selectedDeviceId, devices, canViewProtocols]);

  useEffect(() => {
    if (selectedProtocolId != null) {
      fetchProtocolDetail(selectedProtocolId);
    } else {
      setSelectedProtocolDetail(null);
    }
  }, [selectedProtocolId]);

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

  const handleUnassignClick = () => {
    if (!selectedDeviceId) return;
    // Modal öffnen und Raum des aktuellen Benutzers vorauswählen
    const currentUserRoom = currentUser ? roomsWithUsers.find(r => r.users.includes(currentUser.name))?.id : null;
    setUnassignTargetRoomId(currentUserRoom ? String(currentUserRoom) : '');
    setShowUnassignModal(true);
  };

  const handleUnassignConfirm = async () => {
    if (!selectedDeviceId || !unassignTargetRoomId) return;
    setActionError(null);

    try {
      const res = await fetch(`/api/devices/${selectedDeviceId}/unassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRoomId: Number(unassignTargetRoomId) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Entfernen der Zuordnung');
      }
      await fetchDevices();
      await fetchHistory(selectedDeviceId);
      setShowUnassignModal(false);
      setUnassignTargetRoomId('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Fehler beim Entfernen der Zuordnung');
    }
  };

  const handleRetireClick = () => {
    if (!selectedDeviceId) return;
    const activeAccessories = deviceAccessories.filter((a) => a.status === 'ACTIVE');
    
    if (activeAccessories.length > 0) {
      // Initialisiere Aktionen: Standard ist "return" (zurück ins Inventar)
      const initialActions: Record<number, 'retire' | 'return'> = {};
      activeAccessories.forEach((acc) => {
        initialActions[acc.accessoryId] = 'return';
      });
      setRetireAccessoryActions(initialActions);
      setShowRetireModal(true);
    } else {
      // Keine aktiven Zubehörteile, direkt ausbuchen
      handleRetireConfirm();
    }
  };

  const handleRetireConfirm = async () => {
    if (!selectedDeviceId) return;
    setActionError(null);

    try {
      const res = await fetch(`/api/devices/${selectedDeviceId}/retire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessoryActions: retireAccessoryActions }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Ausbuchen des Geräts');
      }
      setShowRetireModal(false);
      setRetireAccessoryActions({});
      await fetchDevices();
      await fetchHistory(selectedDeviceId);
      await fetchDeviceAccessories(selectedDeviceId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Fehler beim Ausbuchen des Geräts');
    }
  };

  const handleStartEditDevice = () => {
    if (!selectedDevice) return;
    setEditDeviceData({
      SNO: selectedDevice.sno || '',
      EAN: selectedDevice.ean || '',
      IMEI1: selectedDevice.imei1 || '',
      IMEI2: selectedDevice.imei2 || '',
      Preis: selectedDevice.preis != null ? String(selectedDevice.preis) : '',
      HWID: selectedDevice.hwId ? String(selectedDevice.hwId) : '',
      HSID: selectedDevice.hsId ? String(selectedDevice.hsId) : '',
      MODID: selectedDevice.modelId ? String(selectedDevice.modelId) : '',
    });
    setIsEditingDevice(true);
    setEditDeviceError(null);
  };

  const handleCancelEditDevice = () => {
    setIsEditingDevice(false);
    setEditDeviceError(null);
  };

  const handleSaveDeviceEdit = async () => {
    if (!selectedDeviceId) return;
    setEditDeviceLoading(true);
    setEditDeviceError(null);

    try {
      const payload = {
        SNO: editDeviceData.SNO || null,
        EAN: editDeviceData.EAN || null,
        IMEI1: editDeviceData.IMEI1 || null,
        IMEI2: editDeviceData.IMEI2 || null,
        Preis: editDeviceData.Preis ? Number(editDeviceData.Preis) : null,
        HWID: editDeviceData.HWID ? Number(editDeviceData.HWID) : null,
        HSID: editDeviceData.HSID ? Number(editDeviceData.HSID) : null,
        MODID: editDeviceData.MODID ? Number(editDeviceData.MODID) : null,
      };

      const res = await fetch(`/api/devices/${selectedDeviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Aktualisieren des Geräts');
      }

      await fetchDevices();
      setIsEditingDevice(false);
    } catch (err) {
      setEditDeviceError(err instanceof Error ? err.message : 'Fehler beim Aktualisieren des Geräts');
    } finally {
      setEditDeviceLoading(false);
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
        EAN: newDevice.EAN || null,
        IMEI1: newDevice.IMEI1 || null,
        IMEI2: newDevice.IMEI2 || null,
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

      setNewDevice({ HWID: '', HSID: '', MODID: '', SNO: '', Preis: '', Zugang: '', EAN: '', IMEI1: '', IMEI2: '' });
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
        d.inventarCode,
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
            <div className="p-2 bg-primary rounded-lg shadow-sm">
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Geräte-Liste, Filter & Neuanlage */}
            <section className="flex-1 flex flex-col gap-4" id="device-detail-section">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <MonitorSmartphone className="w-4 h-4 text-primary-dark" />
                Geräte
              </h2>
              {canCreateDevices && (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-1.5 text-xs font-medium text-primary-dark hover:bg-primary/10"
                  onClick={() => setCreating((prev) => !prev)}
                >
                  <Plus className="w-3 h-3" />
                  Neues Gerät
                </button>
              )}
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
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <select
                        value={newDevice.HWID}
                        onChange={(e) => setNewDevice((prev) => ({ ...prev, HWID: e.target.value }))}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
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
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <select
                        value={newDevice.HSID}
                        onChange={(e) => setNewDevice((prev) => ({ ...prev, HSID: e.target.value }))}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
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
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <select
                        value={newDevice.MODID}
                        onChange={(e) => setNewDevice((prev) => ({ ...prev, MODID: e.target.value }))}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
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
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
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
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Zugang (Datum)</label>
                    <input
                      type="date"
                      value={newDevice.Zugang}
                      onChange={(e) => setNewDevice((prev) => ({ ...prev, Zugang: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">EAN (optional)</label>
                    <input
                      type="text"
                      value={newDevice.EAN}
                      onChange={(e) => setNewDevice((prev) => ({ ...prev, EAN: e.target.value }))}
                      placeholder="z.B. 4012345678901"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">IMEI 1 (optional)</label>
                    <input
                      type="text"
                      value={newDevice.IMEI1}
                      onChange={(e) => setNewDevice((prev) => ({ ...prev, IMEI1: e.target.value }))}
                      placeholder="z.B. 353456789012345"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">IMEI 2 (optional)</label>
                    <input
                      type="text"
                      value={newDevice.IMEI2}
                      onChange={(e) => setNewDevice((prev) => ({ ...prev, IMEI2: e.target.value }))}
                      placeholder="z.B. 353456789012346"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
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
                    className="px-3 py-1.5 text-xs rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-50"
                    disabled={saving}
                  >
                    Speichern
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col sm:flex-row gap-3 text-xs">
              <div className="flex-1 flex flex-col sm:flex-row gap-2 min-w-0">
                <input
                  type="text"
                  placeholder="Suchen (SNO, EAN, IMEI, Typ, Modell, Benutzer)..."
                  value={deviceSearch}
                  onChange={(e) => setDeviceSearch(e.target.value)}
                  className="w-full sm:flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  style={{ minWidth: '200px' }}
                />
                <select
                  value={filterUserId}
                  onChange={(e) => setFilterUserId(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  style={{ 
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")', 
                    backgroundPosition: 'right 0.5rem center', 
                    backgroundRepeat: 'no-repeat', 
                    backgroundSize: '1.5em 1.5em', 
                    paddingRight: '2.5rem',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: '#d1d5db',
                    minWidth: '14rem',
                    width: '14rem',
                    flexShrink: 0
                  }}
                >
                  <option value="">Alle Benutzer</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} (ID {u.id})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'retired')}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  style={{ 
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3E%3Cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3E%3C/svg%3E")', 
                    backgroundPosition: 'right 0.5rem center', 
                    backgroundRepeat: 'no-repeat', 
                    backgroundSize: '1.5em 1.5em', 
                    paddingRight: '2.5rem',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: '#d1d5db',
                    minWidth: '10rem',
                    width: '10rem',
                    flexShrink: 0
                  }}
                >
                  <option value="all">Alle Status</option>
                  <option value="active">Nur aktive</option>
                  <option value="retired">Nur ausgebuchte</option>
                </select>
                <label className="inline-flex items-center gap-2 px-2 py-1.5 border border-gray-200 rounded-lg text-gray-600 text-[11px] font-medium whitespace-nowrap flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={showUnassignedOnly}
                    onChange={(e) => setShowUnassignedOnly(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-1 focus:ring-primary"
                  />
                  Nur ohne Benutzer
                </label>
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
                  <RefreshCw className="w-5 h-5 text-primary-dark animate-spin" />
                </div>
              ) : devicesError ? (
                <div className="p-4 text-sm text-red-600">{devicesError}</div>
              ) : (
                <>
                  {/* Desktop: Tabelle */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">Inventar-Nr.</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">SNO</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">Typ</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">Hersteller</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">Modell</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">Status</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">Benutzer</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-600">Raum</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredDevices.map((d) => {
                          const isSelected = d.id === selectedDeviceId;
                          const active = !d.abgang;
                          return (
                            <tr
                              key={d.id}
                              className={`cursor-pointer transition-colors ${
                                isSelected 
                                  ? 'bg-primary/10 border-l-4 border-primary shadow-sm' 
                                  : 'hover:bg-gray-50 border-l-4 border-transparent'
                              }`}
                              onClick={() => setSelectedDeviceId(d.id)}
                            >
                              <td className={`px-3 py-2 font-semibold ${isSelected ? 'text-primary' : 'text-primary-dark'}`}>
                                {d.inventarCode}
                              </td>
                              <td className={`px-3 py-2 font-medium ${isSelected ? 'text-gray-900' : 'text-gray-800'}`}>
                                {d.sno}
                              </td>
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
                              <td className="px-3 py-2 text-gray-700">
                                <div className="font-medium text-gray-900">
                                  {d.effectiveRoom || d.raumName || '—'}
                                </div>
                                {d.raumId && (
                                  <div className="text-[11px] text-gray-500">
                                    Raum-ID: {d.raumId}
                                  </div>
                                )}
                                {d.effectiveRoom && d.effectiveRoomSource === 'user' && d.raumName && d.raumName !== d.effectiveRoom && (
                                  <div className="text-[11px] text-gray-400">
                                    Standard: {d.raumName}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {devices.length === 0 && (
                          <tr>
                            <td className="px-3 py-4 text-center text-gray-500" colSpan={8}>
                              Keine Geräte vorhanden
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile: Karten-Layout */}
                  <div className="md:hidden divide-y divide-gray-100">
                    {filteredDevices.map((d) => {
                      const isSelected = d.id === selectedDeviceId;
                      const active = !d.abgang;
                      return (
                        <div
                          key={d.id}
                          className={`p-3 cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-primary/10 border-l-4 border-primary shadow-sm' 
                              : 'active:bg-gray-100 border-l-4 border-transparent'
                          }`}
                          onClick={() => {
                            setSelectedDeviceId(d.id);
                            setShowMobileDetail(true);
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm text-primary-dark">{d.inventarCode}</span>
                                <span className="font-medium text-sm text-gray-900 truncate">{d.sno}</span>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                                    active
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                  {active ? 'Aktiv' : 'Aus'}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 truncate">
                                {[d.hwName, d.hsName, d.modelName].filter(Boolean).join(' · ') || '-'}
                              </div>
                              {d.currentUserName && (
                                <div className="text-xs text-primary-dark mt-0.5 flex items-center gap-1">
                                  <UserRound className="w-3 h-3" />
                                  {d.currentUserName}
                                </div>
                              )}
                              {d.effectiveRoom && (
                                <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {d.effectiveRoom}
                                </div>
                              )}
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                          </div>
                        </div>
                      );
                    })}
                    {devices.length === 0 && (
                      <div className="p-4 text-center text-sm text-gray-500">
                        Keine Geräte vorhanden
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Nicht zugewiesene Geräte - Ausklappbare Sektion */}
            {devices.filter(d => !d.currentUserName && !d.abgang).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowUnassignedSection(!showUnassignedSection)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-semibold text-gray-900">Nicht zugewiesene Geräte</h3>
                      <p className="text-xs text-gray-600">Verfügbare Geräte ohne Benutzerzuordnung</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-amber-100 rounded-full">
                      <span className="text-sm font-bold text-amber-700">
                        {devices.filter(d => !d.currentUserName && !d.abgang).length}
                      </span>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
                      showUnassignedSection ? 'rotate-90' : ''
                    }`} />
                  </div>
                </button>

                {showUnassignedSection && (
                  <div className="border-t border-gray-200">
                    {/* Desktop: Tabelle */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-amber-50 border-b border-amber-100">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600">Inventar-Nr.</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600">SNO</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600">Typ</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600">Hersteller</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600">Modell</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600">Raum</th>
                            <th className="px-3 py-2 text-left font-semibold text-gray-600">Zugang</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {devices
                            .filter(d => !d.currentUserName && !d.abgang)
                            .map((d) => {
                              const isSelected = d.id === selectedDeviceId;
                              return (
                                <tr
                                  key={d.id}
                                  className={`cursor-pointer transition-colors ${
                                    isSelected 
                                      ? 'bg-primary/10 border-l-4 border-primary shadow-sm' 
                                      : 'hover:bg-amber-50/50 border-l-4 border-transparent'
                                  }`}
                                  onClick={() => setSelectedDeviceId(d.id)}
                                >
                                  <td className={`px-3 py-2 font-semibold ${
                                    isSelected ? 'text-primary' : 'text-primary-dark'
                                  }`}>
                                    {d.inventarCode}
                                  </td>
                                  <td className={`px-3 py-2 font-medium ${
                                    isSelected ? 'text-gray-900' : 'text-gray-800'
                                  }`}>
                                    {d.sno}
                                  </td>
                                  <td className="px-3 py-2 text-gray-700">{d.hwName || '-'}</td>
                                  <td className="px-3 py-2 text-gray-700">{d.hsName || '-'}</td>
                                  <td className="px-3 py-2 text-gray-700">{d.modelName || '-'}</td>
                                  <td className="px-3 py-2 text-gray-700">
                                    <div className="font-medium text-gray-900">
                                      {d.effectiveRoom || d.raumName || '—'}
                                    </div>
                                    {d.raumId && (
                                      <div className="text-[11px] text-gray-500">
                                        Raum-ID: {d.raumId}
                                      </div>
                                    )}
                                    {d.effectiveRoom && d.effectiveRoomSource === 'user' && d.raumName && d.raumName !== d.effectiveRoom && (
                                      <div className="text-[11px] text-gray-400">
                                        Standard: {d.raumName}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-gray-600">
                                    {d.zugang
                                      ? new Date(d.zugang).toLocaleDateString('de-DE')
                                      : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile: Karten-Layout */}
                    <div className="md:hidden divide-y divide-gray-100">
                      {devices
                        .filter(d => !d.currentUserName && !d.abgang)
                        .map((d) => {
                          const isSelected = d.id === selectedDeviceId;
                          return (
                            <div
                              key={d.id}
                              className={`p-3 cursor-pointer transition-colors ${
                                isSelected 
                                  ? 'bg-primary/10 border-l-4 border-primary shadow-sm' 
                                  : 'active:bg-amber-50/50 border-l-4 border-transparent'
                              }`}
                              onClick={() => {
                                setSelectedDeviceId(d.id);
                                setShowMobileDetail(true);
                              }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-sm text-primary-dark">{d.inventarCode}</span>
                                    <span className="font-medium text-sm text-gray-900 truncate">{d.sno}</span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 bg-amber-50 text-amber-700">
                                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                      Verfügbar
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-600 truncate">
                                    {[d.hwName, d.hsName, d.modelName].filter(Boolean).join(' · ') || '-'}
                                  </div>
                                  {d.effectiveRoom && (
                                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {d.effectiveRoom}
                                    </div>
                                  )}
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Detail & Aktionen - Desktop */}
          <section className="hidden lg:flex w-full lg:w-[42rem] flex-col gap-4">
            {/* Zuordnung & Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <UserRound className="w-4 h-4 text-primary-dark" />
                    Zuordnung & Status
                  </h2>
                  {selectedDevice && canEditDevices && !isEditingDevice && (
                    <button
                      type="button"
                      onClick={handleStartEditDevice}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-primary-dark bg-primary/10 rounded-lg hover:bg-primary/20"
                      title="Gerätedaten bearbeiten"
                    >
                      <Edit2 className="w-3 h-3" />
                      Bearbeiten
                    </button>
                  )}
                </div>

                {selectedDevice ? (
                  <>
                    {!isEditingDevice ? (
                      <>
                        <div className="mb-3 text-xs text-gray-700">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-primary-dark">{selectedDevice.inventarCode}</span>
                            <button
                              type="button"
                              onClick={() => setShowStickerModal(true)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-primary-dark bg-primary/10 rounded-lg hover:bg-primary/20"
                              title="Inventar-Sticker generieren"
                            >
                              <QrCode className="w-3 h-3" />
                              Sticker
                            </button>
                          </div>
                          <div className="font-medium text-gray-900 mb-1">{selectedDevice.sno}</div>
                          <div>{selectedDevice.hwName || '-'}</div>
                          <div>{selectedDevice.hsName || '-'}</div>
                          <div>{selectedDevice.modelName || '-'}</div>
                        </div>
                      </>
                    ) : (
                      <div className="mb-3 space-y-2">
                        <div className="text-xs font-semibold text-primary-dark mb-2">{selectedDevice.inventarCode}</div>
                        
                        <div>
                          <label className="block text-[11px] font-medium text-gray-700 mb-1">Seriennummer (SNO)</label>
                          <input
                            type="text"
                            value={editDeviceData.SNO}
                            onChange={(e) => setEditDeviceData(prev => ({ ...prev, SNO: e.target.value }))}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Seriennummer"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[11px] font-medium text-gray-700 mb-1">HW</label>
                            <select
                              value={editDeviceData.HWID}
                              onChange={(e) => setEditDeviceData(prev => ({ ...prev, HWID: e.target.value }))}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="">--</option>
                              {hwOptions.map((hw) => (
                                <option key={hw.id} value={hw.id}>
                                  {hw.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-gray-700 mb-1">HS</label>
                            <select
                              value={editDeviceData.HSID}
                              onChange={(e) => setEditDeviceData(prev => ({ ...prev, HSID: e.target.value }))}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="">--</option>
                              {hsOptions.map((hs) => (
                                <option key={hs.id} value={hs.id}>
                                  {hs.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-gray-700 mb-1">Modell</label>
                            <select
                              value={editDeviceData.MODID}
                              onChange={(e) => setEditDeviceData(prev => ({ ...prev, MODID: e.target.value }))}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="">--</option>
                              {modOptions.map((mod) => (
                                <option key={mod.id} value={mod.id}>
                                  {mod.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {!isEditingDevice ? (
                      <>
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
                          <div className="flex items-start gap-2 mt-1 text-gray-700">
                            <MapPin className="w-3.5 h-3.5 mt-0.5 text-primary-dark" />
                            <div>
                              <div className="font-medium text-gray-900">
                                {selectedDevice.effectiveRoom || selectedDevice.raumName || '— kein Raum hinterlegt —'}
                              </div>
                              <div className="text-[11px] text-gray-500">
                                {selectedDevice.effectiveRoom
                                  ? selectedDevice.effectiveRoomSource === 'user'
                                    ? 'Raum des aktuellen Benutzers'
                                    : 'Standard-Raum des Geräts'
                                  : selectedDevice.raumName
                                    ? 'Standard-Raum des Geräts'
                                    : 'Bitte Raum zuweisen'}
                              </div>
                              {selectedDevice.raumName && selectedDevice.effectiveRoom !== selectedDevice.raumName && (
                                <div className="text-[11px] text-gray-500">
                                  Standard-Raum: <span className="font-medium text-gray-700">{selectedDevice.raumName}</span>
                                </div>
                              )}
                              {selectedDevice.raumStandort && (
                                <div className="text-[11px] text-gray-500">
                                  Standort: {selectedDevice.raumStandort}
                                </div>
                              )}
                              {selectedDevice.raumBranch && (
                                <div className="text-[11px] text-gray-500">
                                  Geschäftsstelle: {selectedDevice.raumBranch}
                                  {selectedDevice.raumBranchCity ? ` (${selectedDevice.raumBranchCity})` : ''}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="mb-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-medium text-gray-700 mb-1">Preis (€)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editDeviceData.Preis}
                              onChange={(e) => setEditDeviceData(prev => ({ ...prev, Preis: e.target.value }))}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-gray-700 mb-1">EAN</label>
                            <input
                              type="text"
                              value={editDeviceData.EAN}
                              onChange={(e) => setEditDeviceData(prev => ({ ...prev, EAN: e.target.value }))}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="EAN-Code"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-medium text-gray-700 mb-1">IMEI 1</label>
                            <input
                              type="text"
                              value={editDeviceData.IMEI1}
                              onChange={(e) => setEditDeviceData(prev => ({ ...prev, IMEI1: e.target.value }))}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="IMEI 1"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-gray-700 mb-1">IMEI 2</label>
                            <input
                              type="text"
                              value={editDeviceData.IMEI2}
                              onChange={(e) => setEditDeviceData(prev => ({ ...prev, IMEI2: e.target.value }))}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="IMEI 2"
                            />
                          </div>
                        </div>

                        {editDeviceError && (
                          <div className="text-[11px] text-red-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {editDeviceError}
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <button
                            type="button"
                            onClick={handleSaveDeviceEdit}
                            disabled={editDeviceLoading}
                            className="flex-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-dark disabled:bg-primary/50 disabled:cursor-not-allowed"
                          >
                            {editDeviceLoading ? 'Speichert...' : 'Speichern'}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEditDevice}
                            disabled={editDeviceLoading}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-xs font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    )}

                    {!isEditingDevice && !loadingUsers && canEditDevices && (
                      <div className="mb-3 text-xs space-y-2">
                        <label className="block text-xs font-medium text-gray-700">Benutzer zuweisen</label>
                        <select
                          value={assignUserId}
                          onChange={(e) => setAssignUserId(e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
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
                            className="flex-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs hover:bg-primary-dark"
                          >
                            Zuweisen
                          </button>
                          <button
                            type="button"
                            onClick={handleUnassignClick}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-xs hover:bg-gray-50"
                          >
                            Zuordnung entfernen
                          </button>
                        </div>
                      </div>
                    )}

                    {canEditDevices && (
                      <div className="border-t border-gray-100 pt-3 mt-2">
                        <button
                          type="button"
                          onClick={handleRetireClick}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 text-xs text-red-700 hover:bg-red-100"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          Gerät ausbuchen / defekt
                        </button>
                      </div>
                    )}

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

            {/* Zubehör */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-primary-dark" />
                  Zubehör
                </h2>

                {selectedDevice ? (
                  <>
                    {canEditAccessories && (
                      <div className="mb-3 text-xs space-y-2">
                        <label className="block text-xs font-medium text-gray-700">Zubehör aus Lager zuweisen</label>
                        <select
                          value={selectedAccessoryId}
                          onChange={(e) => setSelectedAccessoryId(e.target.value)}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
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
                          className="w-full px-3 py-1.5 rounded-lg bg-primary text-white text-xs hover:bg-primary-dark disabled:bg-primary/50 disabled:cursor-not-allowed"
                        >
                          {accessoryActionLoading ? 'Wird zugewiesen...' : 'Zuweisen & vom Lager abbuchen'}
                        </button>
                      </div>
                    )}

                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-xs font-medium text-gray-700 mb-2">Zugewiesenes Zubehör</p>
                      {accessoriesLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <RefreshCw className="w-4 h-4 text-primary-dark animate-spin" />
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
                                {canEditAccessories && (
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
                                )}
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>

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

            {/* Verlauf & Protokolle */}
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4 flex-1 flex flex-col">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-primary-dark" />
                  Verlauf
                </h2>

                {selectedDevice ? (
                  historyLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-primary-dark animate-spin" />
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

              {canViewProtocols && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-primary-dark" />
                      Protokolle
                    </h2>
                    <Link
                      href="/protokolle"
                      className="text-[11px] font-medium text-primary-dark hover:underline"
                    >
                      Alle ansehen
                    </Link>
                  </div>

                  {selectedDevice ? (
                    protocolsLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <RefreshCw className="w-5 h-5 text-primary-dark animate-spin" />
                      </div>
                    ) : deviceProtocols.length === 0 ? (
                      <p className="text-xs text-gray-500">Keine Protokolle für dieses Gerät vorhanden.</p>
                    ) : (
                      <>
                        <ul className="space-y-2 text-xs text-gray-700">
                          {deviceProtocols.slice(0, 5).map((protocol) => (
                            <li key={protocol.id}>
                              <button
                                type="button"
                                onClick={() => setSelectedProtocolId(protocol.id)}
                                className={`w-full text-left border border-gray-200 rounded-lg px-3 py-2 bg-gray-50/70 flex items-center gap-3 hover:bg-gray-100 transition-colors ${
                                  protocol.id === selectedProtocolId ? 'ring-2 ring-primary' : ''
                                }`}
                              >
                                <div className="p-1.5 rounded-lg bg-white border border-gray-200">
                                  {renderProtocolTypeIcon(protocol.typ)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-primary-dark truncate">{protocol.protokollNr}</div>
                                  <div className="text-[11px] text-gray-500 truncate">
                                    {protocol.benutzerName || 'Unbekannt'} • {formatDate(protocol.erstelltAm)}
                                  </div>
                                </div>
                                {renderProtocolStatusBadge(protocol.status)}
                              </button>
                            </li>
                          ))}
                        </ul>
                        {deviceProtocols.length > 0 && selectedProtocolDetail && (
                          <div className="mt-4 border border-gray-200 rounded-lg p-3 bg-white space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-xs text-gray-500">
                                  {getProtocolTypeLabel(selectedProtocolDetail.typ)}
                                </p>
                                <p className="text-sm font-semibold text-gray-900">{selectedProtocolDetail.protokollNr}</p>
                              </div>
                              <Link
                                href={`/protokolle/${selectedProtocolDetail.id}`}
                                className="text-[11px] font-medium text-primary-dark hover:underline"
                              >
                                Im Protokoll öffnen
                              </Link>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-[11px] text-gray-600">
                              <div>
                                <p className="text-gray-500">Mitarbeiter</p>
                                <p className="font-medium text-gray-900">
                                  {selectedProtocolDetail.benutzer?.name || 'Unbekannt'}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500">Datum</p>
                                <p className="font-medium text-gray-900">{formatDate(selectedProtocolDetail.erstelltAm)}</p>
                              </div>
                            </div>
                            {selectedProtocolDetail.bemerkung && (
                              <div className="text-[11px] text-gray-600">
                                <p className="text-gray-500 mb-1">Bemerkung</p>
                                <p className="bg-gray-50 rounded-lg p-2 text-gray-700">
                                  {selectedProtocolDetail.bemerkung}
                                </p>
                              </div>
                            )}
                            {selectedProtocolDetail.positionen && selectedProtocolDetail.positionen.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-[11px] text-gray-500">Positionen</p>
                                <ul className="space-y-1">
                                  {selectedProtocolDetail.positionen.slice(0, 3).map((pos) => (
                                    <li key={pos.id} className="text-[11px] text-gray-700 flex items-center gap-2">
                                      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                                      <span className="truncate">
                                        {pos.geraet
                                          ? `Gerät ${pos.geraet.inventarCode}${
                                              pos.geraet.sno ? ` (${pos.geraet.sno})` : ''
                                            }`
                                          : pos.zubehoer?.typ || 'Position'}{' '}
                                        {pos.zustand ? `• ${pos.zustand}` : ''}
                                      </span>
                                    </li>
                                  ))}
                                  {selectedProtocolDetail.positionen.length > 3 && (
                                    <li className="text-[11px] text-gray-500">… weitere Positionen</li>
                                  )}
                                </ul>
                              </div>
                            )}
                            {protocolDetailLoading && (
                              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Protokolldetails werden geladen …
                              </div>
                            )}
                            {protocolError && (
                              <p className="text-[11px] text-red-600 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {protocolError}
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    )
                  ) : (
                    <p className="text-xs text-gray-500">Wähle links ein Gerät, um Protokolle zu sehen.</p>
                  )}
                </div>
              )}
            </div>
          </section>
          </div>
        </div>
      </main>

      {/* Mobile Detail-Panel (Slide-up Modal) */}
      {showMobileDetail && selectedDevice && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowMobileDetail(false)}
          />
          
          {/* Panel */}
          <div className="absolute inset-x-0 bottom-0 max-h-[90vh] bg-white rounded-t-2xl shadow-xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MonitorSmartphone className="w-5 h-5 text-primary-dark" />
                <span className="font-semibold text-primary-dark">{selectedDevice.inventarCode}</span>
                <span className="font-medium text-gray-900">{selectedDevice.sno}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileDetail(false)}
                className="p-2 -mr-2 rounded-full hover:bg-gray-100 active:bg-gray-200"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {/* Geräte-Info */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-gray-700">
                    <div>{selectedDevice.hwName || '-'}</div>
                    <div>{selectedDevice.hsName || '-'}</div>
                    <div>{selectedDevice.modelName || '-'}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowStickerModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-primary-dark bg-primary/10 rounded-lg hover:bg-primary/20"
                  >
                    <QrCode className="w-4 h-4" />
                    Sticker
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-500 mb-0.5">Zugang</div>
                    <div className="font-medium text-gray-900">
                      {selectedDevice.zugang
                        ? new Date(selectedDevice.zugang).toLocaleDateString('de-DE')
                        : '—'}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-500 mb-0.5">Abgang</div>
                    <div className="font-medium text-gray-900">
                      {selectedDevice.abgang
                        ? new Date(selectedDevice.abgang).toLocaleDateString('de-DE')
                        : '—'}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-500 mb-0.5">Status</div>
                    <div className={`font-medium ${selectedDevice.abgang ? 'text-gray-600' : 'text-emerald-600'}`}>
                      {selectedDevice.abgang ? 'Ausgebucht' : 'Aktiv'}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-500 mb-0.5">Benutzer</div>
                    <div className="font-medium text-gray-900 truncate">
                      {selectedDevice.currentUserName || '— keiner —'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Benutzer zuweisen */}
              {!loadingUsers && canEditDevices && (
                <div className="p-4 border-b border-gray-100">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Benutzer zuweisen</label>
                  <select
                    value={assignUserId}
                    onChange={(e) => setAssignUserId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- Benutzer wählen --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} (ID {u.id})
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={handleAssign}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark active:bg-primary-dark"
                    >
                      Zuweisen
                    </button>
                    <button
                      type="button"
                      onClick={handleUnassignClick}
                      className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 active:bg-gray-100"
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              )}

              {/* Verlauf */}
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-primary-dark" />
                  Verlauf
                </h3>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw className="w-5 h-5 text-primary-dark animate-spin" />
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-sm text-gray-500">Keine Zuordnungen vorhanden.</p>
                ) : (
                  <ul className="space-y-2">
                    {history.map((entry) => (
                      <li
                        key={entry.id}
                        className="rounded-lg border border-gray-200 px-3 py-2 bg-gray-50"
                      >
                        <div className="font-medium text-sm text-gray-900">
                          {entry.benutzerName || `Benutzer ${entry.benutzerId}`}
                        </div>
                        <div className="text-xs text-gray-600">
                          {new Date(entry.start).toLocaleDateString('de-DE')} – {entry.ende ? new Date(entry.ende).toLocaleDateString('de-DE') : 'heute'}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Zubehör */}
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-primary-dark" />
                  Zubehör
                </h3>

                {/* Zubehör zuweisen */}
                {canEditAccessories && (
                  <div className="mb-4">
                    <select
                      value={selectedAccessoryId}
                      onChange={(e) => setSelectedAccessoryId(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                      className="w-full mt-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:bg-primary/50 disabled:cursor-not-allowed"
                    >
                      {accessoryActionLoading ? 'Wird zugewiesen...' : 'Zuweisen'}
                    </button>
                  </div>
                )}

                {/* Zugewiesenes Zubehör */}
                {accessoriesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw className="w-4 h-4 text-primary-dark animate-spin" />
                  </div>
                ) : deviceAccessories.filter((a) => a.status === 'ACTIVE').length === 0 ? (
                  <p className="text-sm text-gray-500">Kein Zubehör zugewiesen.</p>
                ) : (
                  <ul className="space-y-2">
                    {deviceAccessories
                      .filter((a) => a.status === 'ACTIVE')
                      .map((acc) => (
                        <li
                          key={acc.id}
                          className="rounded-lg border border-gray-200 px-3 py-2 bg-gray-50 flex items-center justify-between gap-2"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900">{acc.accessoryLabel}</div>
                            <div className="text-xs text-gray-500">
                              seit {acc.start ? new Date(acc.start).toLocaleDateString('de-DE') : '—'}
                            </div>
                          </div>
                          {canEditAccessories && (
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleReturnAccessory(acc.id, true)}
                                disabled={accessoryActionLoading}
                                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 active:bg-emerald-100"
                                title="Zurückgeben"
                              >
                                <Undo2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReturnAccessory(acc.id, false)}
                                disabled={accessoryActionLoading}
                                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 active:bg-red-100"
                                title="Ausbuchen"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                  </ul>
                )}
              </div>

              {/* Gerät ausbuchen */}
              {canEditDevices && (
                <div className="p-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      handleRetireClick();
                      setShowMobileDetail(false);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 text-sm font-medium text-red-700 hover:bg-red-100 active:bg-red-200"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Gerät ausbuchen / defekt
                  </button>
                </div>
              )}

              {actionError && (
                <div className="mx-4 mb-4 p-3 rounded-lg bg-red-50 text-sm text-red-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {actionError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sticker Modal */}
      {showStickerModal && selectedDeviceId && (
        <StickerModal
          deviceId={selectedDeviceId}
          onClose={() => setShowStickerModal(false)}
        />
      )}

      {/* Retire Modal mit Zubehör-Verwaltung */}
      {showRetireModal && selectedDeviceId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Gerät ausbuchen</h2>
                    <p className="text-sm text-gray-600">Was soll mit dem zugewiesenen Zubehör passieren?</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRetireModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-amber-800">
                    <p className="font-medium mb-1">Diesem Gerät ist aktives Zubehör zugewiesen</p>
                    <p className="text-xs">Bitte wähle für jedes Zubehörteil, ob es ebenfalls ausgebucht werden soll oder zurück ins Inventar geht.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {deviceAccessories
                  .filter((a) => a.status === 'ACTIVE')
                  .map((accessory) => (
                    <div key={accessory.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 mb-1">{accessory.accessoryLabel}</div>
                          <div className="text-xs text-gray-600">
                            {accessory.accessoryType && <span className="mr-2">Typ: {accessory.accessoryType}</span>}
                            {accessory.userName && (
                              <span className="inline-flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {accessory.userName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setRetireAccessoryActions((prev) => ({
                                ...prev,
                                [accessory.accessoryId]: 'return',
                              }))
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              retireAccessoryActions[accessory.accessoryId] === 'return'
                                ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500'
                                : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                            }`}
                          >
                            Zurück ins Inventar
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setRetireAccessoryActions((prev) => ({
                                ...prev,
                                [accessory.accessoryId]: 'retire',
                              }))
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              retireAccessoryActions[accessory.accessoryId] === 'retire'
                                ? 'bg-red-100 text-red-700 border-2 border-red-500'
                                : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                            }`}
                          >
                            Auch ausbuchen
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRetireModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleRetireConfirm}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
              >
                Gerät ausbuchen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unassign Modal mit Raumauswahl */}
      {showUnassignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Gerät zurückgeben</h3>
              <p className="text-sm text-gray-600 mt-1">
                Wählen Sie den Ziel-Raum für das Gerät aus
              </p>
            </div>

            <div className="p-6">
              {selectedDevice && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600">Gerät</div>
                  <div className="font-medium text-gray-900">{selectedDevice.inventarCode}</div>
                  <div className="text-sm text-gray-600">
                    {[selectedDevice.hwName, selectedDevice.hsName, selectedDevice.modelName]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                  {selectedDevice.currentUserName && (
                    <div className="text-xs text-gray-600 mt-1">
                      Aktuell bei: <span className="font-medium">{selectedDevice.currentUserName}</span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ziel-Raum <span className="text-red-500">*</span>
                </label>
                <select
                  value={unassignTargetRoomId}
                  onChange={(e) => setUnassignTargetRoomId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={roomsWithUsersLoading}
                >
                  <option value="">-- Raum auswählen --</option>
                  {roomsWithUsers.map((room) => (
                    <option key={room.id} value={room.id}>
                      🏢 {room.name}{room.standort ? ` (${room.standort})` : ''}
                      {room.users.length > 0 ? ` - ${room.users.join(', ')}` : ' - (-)'}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Das Gerät wird in den ausgewählten Raum zurückgelegt
                </p>
              </div>

              {actionError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{actionError}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowUnassignModal(false);
                  setUnassignTargetRoomId('');
                  setActionError(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleUnassignConfirm}
                disabled={!unassignTargetRoomId}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Zurückgeben
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

