'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MonitorSmartphone, ArrowLeft, Loader2, UserRound, History, Package, QrCode, Building2, MapPin, Briefcase, UserPlus, UserMinus, Undo2, Plus, X, Archive, ClipboardList, ArrowUpRight, ArrowDownLeft, Repeat } from 'lucide-react';
import Link from 'next/link';
import StickerModal from '../../components/StickerModal';
import InventoryScanButton from '../../components/InventoryScanButton';

interface CurrentUser {
  id: number;
  name: string | null;
  raum: string | null;
  abteilung: string | null;
  status: string | null;
  geschaeftsstelle: string | null;
  assignedSince: string | null;
}

interface HistoryEntry {
  id: number;
  benutzerId: number;
  benutzerName: string | null;
  start: string;
  ende: string | null;
}

interface AccessoryEntry {
  id: number;
  zubehoerId: number;
  zubehoerTyp: string | null;
  zubehoerHersteller: string | null;
  zubehoerModell: string | null;
  beschreibung: string | null;
  benutzerId: number | null;
  benutzerName: string | null;
  start: string;
  ende: string | null;
  status: 'ACTIVE' | 'RETURNED';
}

interface DeviceProtocol {
  id: number;
  protokollNr: string;
  typ: string;
  status: string;
  erstelltAm: string;
  benutzerName: string | null;
  erstellerName: string | null;
}

interface DeviceDetail {
  // Basis-Felder (gleich wie DeviceListItem in Geräteverwaltung)
  id: number;
  inventarCode: string;
  sno: string;
  zugang: string;
  abgang: string | null;
  hwName: string | null;
  hwCode: string | null;
  hsName: string | null;
  modelName: string | null;
  preis: number | null;
  ean: string | null;
  imei1: string | null;
  imei2: string | null;
  currentUserId: number | null;
  currentUserName: string | null;
  // Raum-Informationen
  raumId: number | null;
  raumName: string | null;
  raumStandort: string | null;
  effectiveRoom: string | null;
  // Zusätzliche Detail-Felder
  currentUser: CurrentUser | null;
  history: HistoryEntry[];
  accessories: AccessoryEntry[];
}

export default function DeviceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [device, setDevice] = useState<DeviceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStickerModal, setShowStickerModal] = useState(false);

  // Bearbeitungs-States
  const [users, setUsers] = useState<{ id: number; name: string; roomId: number | null }[]>([]);
  const [accessoryOptions, setAccessoryOptions] = useState<{ id: number; label: string; stock: number }[]>([]);
  const [rooms, setRooms] = useState<{ id: number; name: string; standort: string | null }[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAccessoryModal, setShowAccessoryModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedAccessoryId, setSelectedAccessoryId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Berechtigungen
  const [currentUserPermissions, setCurrentUserPermissions] = useState<{ permissions: string[]; role: string } | null>(null);
  const canEdit = currentUserPermissions?.permissions?.includes('devices:edit') || currentUserPermissions?.role === 'ADMIN';
  const canEditAccessories = currentUserPermissions?.permissions?.includes('accessories:edit') || currentUserPermissions?.role === 'ADMIN';
  const canViewProtocols = currentUserPermissions?.permissions?.includes('protocols:view') || currentUserPermissions?.role === 'ADMIN';

  // Protokolle
  const [deviceProtocols, setDeviceProtocols] = useState<DeviceProtocol[]>([]);
  const [protocolsLoading, setProtocolsLoading] = useState(false);

  useEffect(() => {
    if (!code) return;

    const fetchDevice = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/devices/by-code/${encodeURIComponent(code)}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('Gerät nicht gefunden');
          } else {
            setError('Fehler beim Laden des Geräts');
          }
          return;
        }
        const data = await res.json();
        setDevice(data);
        setError(null);
      } catch {
        setError('Verbindungsfehler');
      } finally {
        setLoading(false);
      }
    };

    fetchDevice();
    fetchCurrentUser();
  }, [code]);

  // Berechtigungen laden
  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUserPermissions(data.user);
      }
    } catch {
      setCurrentUserPermissions(null);
    }
  };

  // Protokolle für dieses Gerät laden
  const fetchDeviceProtocols = async (deviceId: number) => {
    try {
      setProtocolsLoading(true);
      const res = await fetch(`/api/devices/${deviceId}/protocols`);
      if (res.ok) {
        const data = await res.json();
        setDeviceProtocols(data);
      }
    } catch {
      console.error('Fehler beim Laden der Protokolle');
    } finally {
      setProtocolsLoading(false);
    }
  };

  // Protokolle laden wenn Gerät geladen wurde
  useEffect(() => {
    if (device?.id && canViewProtocols) {
      fetchDeviceProtocols(device.id);
    }
  }, [device?.id, canViewProtocols]);

  // Benutzer laden
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/tables/Benutzer');
      if (res.ok) {
        const json = await res.json();
        const options = (json.data as any[]).map((row) => ({
          id: row.BenutzerID,
          name: row.BenutzerName || `Benutzer ${row.BenutzerID}`,
          roomId: row.RaumID ?? null,
        }));
        setUsers(options);
      }
    } catch {
      console.error('Fehler beim Laden der Benutzer');
    }
  };

  // Kompatibles Zubehör laden
  const fetchAccessoryOptions = async (deviceId: number) => {
    try {
      const res = await fetch(`/api/devices/${deviceId}/compatible-accessories`);
      if (res.ok) {
        const json = await res.json();
        setAccessoryOptions(
          (json.accessories ?? []).map((a: any) => ({
            id: a.id,
            label: a.label,
            stock: a.stock,
          }))
        );
      }
    } catch {
      console.error('Fehler beim Laden des Zubehörs');
    }
  };

  // Räume laden
  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/tables/RAUM');
      if (res.ok) {
        const json = await res.json();
        const options = (json.data as any[]).map((row) => ({
          id: row.RaumID,
          name: row.RaumName || `Raum ${row.RaumID}`,
          standort: row.Standort || null,
        }));
        setRooms(options);
      }
    } catch {
      console.error('Fehler beim Laden der Räume');
    }
  };

  // Gerät neu laden
  const refreshDevice = async () => {
    try {
      const res = await fetch(`/api/devices/by-code/${encodeURIComponent(code)}`);
      if (res.ok) {
        const data = await res.json();
        setDevice(data);
      }
    } catch {
      console.error('Fehler beim Aktualisieren');
    }
  };

  // Gemeinsame Zuordnung: Raum + Benutzer mit Bewegungshistorie (analog Büroinventar)
  const saveAssignment = async (raumId: number | null, benutzerId: number | null) => {
    const res = await fetch(`/api/devices/${device?.id}/assignment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raumId, benutzerId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Fehler beim Speichern der Zuordnung');
    }
  };

  // Benutzer zuweisen (Raum des Benutzers wird übernommen)
  const handleAssignUser = async () => {
    if (!device || !selectedUserId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const user = users.find((u) => u.id === Number(selectedUserId));
      await saveAssignment(user?.roomId ?? device.raumId, Number(selectedUserId));
      await refreshDevice();
      setShowAssignModal(false);
      setSelectedUserId('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setActionLoading(false);
    }
  };

  // Zuweisung entfernen
  const handleUnassignUser = async () => {
    if (!device) return;
    if (!confirm('Möchten Sie die Zuweisung wirklich entfernen?')) return;
    setActionLoading(true);
    setActionError(null);
    try {
      // Raum bleibt beim Gerät (analog Büroinventar)
      await saveAssignment(device.raumId, null);
      await refreshDevice();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setActionLoading(false);
    }
  };

  // Gerät an anderen Benutzer übergeben (direkte Übergabe)
  const handleTransferUser = async () => {
    if (!device || !selectedUserId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const user = users.find((u) => u.id === Number(selectedUserId));
      await saveAssignment(user?.roomId ?? device.raumId, Number(selectedUserId));
      await refreshDevice();
      setShowAssignModal(false);
      setSelectedUserId('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setActionLoading(false);
    }
  };

  // Gerät ausbuchen
  const handleRetireDevice = async () => {
    if (!device) return;
    if (!confirm('Möchten Sie das Gerät wirklich ausbuchen?')) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/devices/${device.id}/retire`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Ausbuchen');
      }
      await refreshDevice();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setActionLoading(false);
    }
  };

  // Zubehör zuweisen
  const handleAssignAccessory = async () => {
    if (!device || !selectedAccessoryId) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/devices/${device.id}/accessories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ZubehoerID: Number(selectedAccessoryId) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Zuweisen des Zubehörs');
      }
      await refreshDevice();
      await fetchAccessoryOptions(device.id);
      setShowAccessoryModal(false);
      setSelectedAccessoryId('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setActionLoading(false);
    }
  };

  // Zubehör zurückgeben
  const handleReturnAccessory = async (assignmentId: number, returnToStock: boolean) => {
    if (!device) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/devices/${device.id}/accessories/${assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnToStock }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler bei der Rückgabe');
      }
      await refreshDevice();
      await fetchAccessoryOptions(device.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setActionLoading(false);
    }
  };

  // Raum ändern
  const handleChangeRoom = async () => {
    if (!device) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const newRaumId = selectedRoomId ? Number(selectedRoomId) : null;
      const currentUserRoom = users.find((u) => u.id === device.currentUserId)?.roomId ?? null;
      const keepUser = device.currentUserId != null && newRaumId !== null && currentUserRoom === newRaumId;
      await saveAssignment(newRaumId, keepUser ? device.currentUserId : null);
      await refreshDevice();
      setShowRoomModal(false);
      setSelectedRoomId('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setActionLoading(false);
    }
  };

  // Modal öffnen und Daten laden
  const openAssignModal = () => {
    fetchUsers();
    setShowAssignModal(true);
    setActionError(null);
  };

  const openAccessoryModal = () => {
    if (device) {
      fetchAccessoryOptions(device.id);
    }
    setShowAccessoryModal(true);
    setActionError(null);
  };

  const openRoomModal = () => {
    fetchRooms();
    if (device) {
      setSelectedRoomId(device.raumId?.toString() || '');
    }
    setShowRoomModal(true);
    setActionError(null);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('de-DE');
  };

  const formatDateRange = (start: string, ende: string | null) => {
    const startDate = formatDate(start);
    if (!ende) return `von ${startDate} bis heute`;
    return `von ${startDate} bis ${formatDate(ende)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-dark animate-spin" />
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-md w-full text-center">
          <MonitorSmartphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-gray-900 mb-2">
            {error || 'Gerät nicht gefunden'}
          </h1>
          <p className="text-sm text-gray-600 mb-4">
            Das Gerät mit dem Code <strong>{code}</strong> konnte nicht gefunden werden.
          </p>
          <button
            onClick={() => router.push('/geraete')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark"
          >
            <ArrowLeft className="w-4 h-4" />
            Zur Geräteverwaltung
          </button>
        </div>
      </div>
    );
  }

  const active = !device.abgang;
  const activeAccessories = device.accessories.filter((a) => a.status === 'ACTIVE');
  const returnedAccessories = device.accessories.filter((a) => a.status === 'RETURNED');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/geraete')}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <MonitorSmartphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-primary-dark">{device.inventarCode}</h1>
                <p className="text-xs text-gray-500">{device.sno}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <InventoryScanButton 
              inventarCode={device.inventarCode}
              deviceName={device.hwName || undefined}
            />
            <button
              onClick={() => setShowStickerModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-primary-dark bg-primary/10 rounded-lg hover:bg-primary/20"
            >
              <QrCode className="w-4 h-4" />
              Sticker
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        {/* Zuordnung & Status */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <UserRound className="w-4 h-4 text-primary-dark" />
            <span className="text-sm font-semibold text-gray-900">Zuordnung & Status</span>
          </div>

          <div className="p-4 space-y-4">
            {/* Geräte-Infos */}
            <div className="space-y-1 text-sm">
              <div className="font-semibold text-primary-dark">{device.inventarCode}</div>
              <div className="text-gray-900">{device.sno}</div>
              <div className="text-gray-700">{device.hwName || '—'}</div>
              <div className="text-gray-700">{device.hsName || '—'}</div>
              <div className="text-gray-700">{device.modelName || '—'}</div>
            </div>

            {/* Daten-Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500 text-xs mb-1">Zugang</div>
                <div className="font-medium text-gray-900">{formatDate(device.zugang)}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">Abgang</div>
                <div className="font-medium text-gray-900">{formatDate(device.abgang)}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">Preis</div>
                <div className="font-medium text-gray-900">
                  {device.preis != null
                    ? Number(device.preis).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">EAN</div>
                <div className="font-medium text-gray-900">{device.ean || '—'}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">IMEI 1</div>
                <div className="font-medium text-gray-900">{device.imei1 || '—'}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">IMEI 2</div>
                <div className="font-medium text-gray-900">{device.imei2 || '—'}</div>
              </div>
            </div>

            {/* Status & Aktionen */}
            <div className="pt-2 border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Status:</span>
                  <span className={active ? 'text-emerald-600 font-medium' : 'text-gray-600 font-medium'}>
                    {active ? 'Aktiv' : 'Ausgebucht'}
                  </span>
                </div>
                {canEdit && active && (
                  <button
                    onClick={handleRetireDevice}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    Ausbuchen
                  </button>
                )}
              </div>

              {/* Aktuelle Zuweisung */}
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  {device.currentUser ? (
                    <span className="text-gray-600">
                      Aktueller Benutzer: <span className="text-primary-dark font-medium">{device.currentUser.name}</span>
                    </span>
                  ) : (
                    <span className="text-gray-500">Kein Benutzer zugewiesen</span>
                  )}
                </div>
                {canEdit && active && (
                  <div className="flex items-center gap-2">
                    {device.currentUser ? (
                      <>
                        <button
                          onClick={openAssignModal}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-primary-dark bg-primary/10 rounded-lg hover:bg-primary/20 disabled:opacity-50"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Übergeben
                        </button>
                        <button
                          onClick={handleUnassignUser}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 disabled:opacity-50"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          Entfernen
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={openAssignModal}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-primary-dark bg-primary/10 rounded-lg hover:bg-primary/20 disabled:opacity-50"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Zuweisen
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Raum */}
              <div className="flex items-center justify-between">
                <div className="text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {device.effectiveRoom ? (
                    <span className="text-gray-600">
                      Raum: <span className="text-gray-900 font-medium">{device.effectiveRoom}</span>
                      {device.currentUser && device.raumName && device.currentUser.raum !== device.raumName && (
                        <span className="text-gray-400 text-xs ml-1">(Benutzer-Raum)</span>
                      )}
                      {!device.currentUser && device.raumName && (
                        <span className="text-gray-400 text-xs ml-1">(Geräte-Standort)</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-gray-500">Kein Raum zugewiesen</span>
                  )}
                </div>
                {canEdit && active && !device.currentUser && (
                  <button
                    onClick={openRoomModal}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    {device.raumId ? 'Ändern' : 'Zuweisen'}
                  </button>
                )}
              </div>

              {/* Fehlermeldung */}
              {actionError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                  {actionError}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Benutzer-Details */}
        {device.currentUser && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <UserRound className="w-4 h-4 text-primary-dark" />
              <span className="text-sm font-semibold text-gray-900">Benutzer-Details</span>
            </div>

            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <UserRound className="w-5 h-5 text-primary-dark" />
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <div className="font-semibold text-gray-900">{device.currentUser.name}</div>
                    {device.currentUser.assignedSince && (
                      <div className="text-xs text-gray-500">
                        Zugewiesen seit {formatDate(device.currentUser.assignedSince)}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {device.currentUser.abteilung && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Briefcase className="w-4 h-4 text-gray-400" />
                        <span>{device.currentUser.abteilung}</span>
                      </div>
                    )}
                    {device.currentUser.geschaeftsstelle && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span>{device.currentUser.geschaeftsstelle}</span>
                      </div>
                    )}
                    {device.currentUser.raum && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>Raum {device.currentUser.raum}</span>
                      </div>
                    )}
                    {device.currentUser.status && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>{device.currentUser.status}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Verlauf */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <History className="w-4 h-4 text-primary-dark" />
            <span className="text-sm font-semibold text-gray-900">Verlauf</span>
          </div>

          <div className="p-4">
            {device.history.length === 0 ? (
              <p className="text-sm text-gray-500">Keine Zuordnungen vorhanden.</p>
            ) : (
              <div className="space-y-3">
                {device.history.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="p-1.5 bg-white rounded-full border border-gray-200">
                      <UserRound className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-primary-dark">
                        {entry.benutzerName || 'Unbekannt'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDateRange(entry.start, entry.ende)}
                      </div>
                    </div>
                    {!entry.ende && (
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-700 rounded-full">
                        Aktuell
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Zubehör */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary-dark" />
              <span className="text-sm font-semibold text-gray-900">Zubehör</span>
            </div>
            {canEditAccessories && active && (
              <button
                onClick={openAccessoryModal}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-primary-dark bg-primary/10 rounded-lg hover:bg-primary/20 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Hinzufügen
              </button>
            )}
          </div>

          <div className="p-4 space-y-4">
            {/* Aktives Zubehör */}
            <div>
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Zugewiesenes Zubehör
              </h4>
              {activeAccessories.length === 0 ? (
                <p className="text-sm text-gray-500">Kein Zubehör zugewiesen.</p>
              ) : (
                <div className="space-y-2">
                  {activeAccessories.map((acc) => (
                    <div
                      key={acc.id}
                      className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100"
                    >
                      <Package className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900">
                          {[acc.zubehoerTyp, acc.zubehoerHersteller, acc.zubehoerModell]
                            .filter(Boolean)
                            .join(' · ') || 'Zubehör'}
                        </div>
                        {acc.beschreibung && (
                          <div className="text-xs text-gray-500 truncate">{acc.beschreibung}</div>
                        )}
                        <div className="text-xs text-gray-500">
                          Seit {formatDate(acc.start)}
                          {acc.benutzerName && ` · ${acc.benutzerName}`}
                        </div>
                      </div>
                      {canEditAccessories && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleReturnAccessory(acc.id, true)}
                            disabled={actionLoading}
                            title="Zurück ins Lager"
                            className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-lg disabled:opacity-50"
                          >
                            <Undo2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReturnAccessory(acc.id, false)}
                            disabled={actionLoading}
                            title="Defekt/Entsorgt"
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Zurückgegebenes Zubehör */}
            {returnedAccessories.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Zurückgegebenes Zubehör
                </h4>
                <div className="space-y-2">
                  {returnedAccessories.map((acc) => (
                    <div
                      key={acc.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <Package className="w-4 h-4 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-700">
                          {[acc.zubehoerTyp, acc.zubehoerHersteller, acc.zubehoerModell]
                            .filter(Boolean)
                            .join(' · ') || 'Zubehör'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDateRange(acc.start, acc.ende)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Übergabeprotokolle */}
        {canViewProtocols && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary-dark" />
                <span className="text-sm font-semibold text-gray-900">Übergabeprotokolle</span>
              </div>
              <Link
                href={`/protokolle/neu?geraet=${device?.id}`}
                className="text-xs text-primary-dark hover:underline"
              >
                Neues Protokoll
              </Link>
            </div>

            <div className="p-4">
              {protocolsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
              ) : deviceProtocols.length === 0 ? (
                <p className="text-sm text-gray-500">Keine Protokolle für dieses Gerät vorhanden.</p>
              ) : (
                <div className="space-y-2">
                  {deviceProtocols.slice(0, 5).map((protocol) => (
                    <Link
                      key={protocol.id}
                      href={`/protokolle/${protocol.id}`}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="p-1.5 bg-white rounded-lg border border-gray-200">
                        {protocol.typ === 'AUSGABE' && <ArrowUpRight className="w-4 h-4 text-emerald-600" />}
                        {protocol.typ === 'RUECKGABE' && <ArrowDownLeft className="w-4 h-4 text-amber-600" />}
                        {protocol.typ === 'TAUSCH' && <Repeat className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-primary-dark">
                          {protocol.protokollNr}
                        </div>
                        <div className="text-xs text-gray-500">
                          {protocol.benutzerName || 'Unbekannt'} • {new Date(protocol.erstelltAm).toLocaleDateString('de-DE')}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                        protocol.status === 'UNTERSCHRIEBEN' 
                          ? 'bg-emerald-100 text-emerald-700'
                          : protocol.status === 'OFFEN'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {protocol.status === 'UNTERSCHRIEBEN' ? 'Signiert' : protocol.status === 'OFFEN' ? 'Offen' : 'Entwurf'}
                      </span>
                    </Link>
                  ))}
                  {deviceProtocols.length > 5 && (
                    <Link
                      href={`/protokolle?geraet=${device?.id}`}
                      className="block text-center text-xs text-primary-dark hover:underline py-2"
                    >
                      Alle {deviceProtocols.length} Protokolle anzeigen
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Sticker Modal */}
      {showStickerModal && device && (
        <StickerModal
          deviceId={device.id}
          onClose={() => setShowStickerModal(false)}
        />
      )}

      {/* Benutzer zuweisen/übergeben Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {device?.currentUser ? 'Gerät übergeben' : 'Benutzer zuweisen'}
              </h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedUserId('');
                  setActionError(null);
                }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {device?.currentUser && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                  <span className="text-amber-800">
                    Aktuell zugewiesen an: <strong>{device.currentUser.name}</strong>
                  </span>
                  <p className="text-xs text-amber-600 mt-1">
                    Die aktuelle Zuweisung wird automatisch beendet.
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {device?.currentUser ? 'Neuer Benutzer' : 'Benutzer auswählen'}
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Benutzer wählen...</option>
                  {users
                    .filter((user) => user.id !== device?.currentUserId)
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                </select>
              </div>
              {actionError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                  {actionError}
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedUserId('');
                  setActionError(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Abbrechen
              </button>
              <button
                onClick={device?.currentUser ? handleTransferUser : handleAssignUser}
                disabled={!selectedUserId || actionLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50"
              >
                {actionLoading 
                  ? (device?.currentUser ? 'Wird übergeben...' : 'Wird zugewiesen...') 
                  : (device?.currentUser ? 'Übergeben' : 'Zuweisen')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zubehör hinzufügen Modal */}
      {showAccessoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Zubehör hinzufügen</h3>
              <button
                onClick={() => {
                  setShowAccessoryModal(false);
                  setSelectedAccessoryId('');
                  setActionError(null);
                }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zubehör auswählen
                </label>
                {accessoryOptions.length === 0 ? (
                  <p className="text-sm text-gray-500">Kein kompatibles Zubehör verfügbar.</p>
                ) : (
                  <select
                    value={selectedAccessoryId}
                    onChange={(e) => setSelectedAccessoryId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Zubehör wählen...</option>
                    {accessoryOptions.map((acc) => (
                      <option key={acc.id} value={acc.id} disabled={acc.stock <= 0}>
                        {acc.label} (Bestand: {acc.stock})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {actionError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                  {actionError}
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAccessoryModal(false);
                  setSelectedAccessoryId('');
                  setActionError(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Abbrechen
              </button>
              <button
                onClick={handleAssignAccessory}
                disabled={!selectedAccessoryId || actionLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50"
              >
                {actionLoading ? 'Wird hinzugefügt...' : 'Hinzufügen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raum ändern Modal */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Raum zuweisen</h3>
              <button
                onClick={() => {
                  setShowRoomModal(false);
                  setSelectedRoomId('');
                  setActionError(null);
                }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                Weisen Sie dem Gerät einen Standort-Raum zu. Dieser wird angezeigt, wenn kein Benutzer zugewiesen ist.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Raum auswählen
                </label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Kein Raum (entfernen)</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}{room.standort ? ` (${room.standort})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {actionError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                  {actionError}
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRoomModal(false);
                  setSelectedRoomId('');
                  setActionError(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Abbrechen
              </button>
              <button
                onClick={handleChangeRoom}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50"
              >
                {actionLoading ? 'Wird gespeichert...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
