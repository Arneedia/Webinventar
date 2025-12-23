'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ClipboardList,
  ArrowLeft,
  Loader2,
  Printer,
  Download,
  CheckCircle2,
  Clock,
  FileEdit,
  Archive,
  User,
  Calendar,
  MonitorSmartphone,
  Package,
  ArrowUpRight,
  ArrowDownLeft,
  Repeat,
  PenTool,
  Trash2,
  AlertCircle,
  Plus,
  Save,
  RefreshCw,
  Building2,
  MapPin,
} from 'lucide-react';

interface ProtocolDetail {
  id: number;
  protokollNr: string;
  typ: string;
  status: string;
  erstelltAm: string;
  unterschriftMitarbeiter: string | null;
  unterschriftIT: string | null;
  unterschriftDatum: string | null;
  bemerkung: string | null;
  aufgaben: {
    id: number;
    titel: string;
    beschreibung: string | null;
    faelligAm: string | null;
    status: string;
    assignedBenutzerId: number | null;
    assignedBenutzerName: string | null;
    assignedAbteilungId: number | null;
    assignedAbteilungName: string | null;
  }[];
  benutzer: {
    id: number;
    name: string | null;
    abteilung: string | null;
    geschaeftsstelle: string | null;
    status: string | null;
    raum: string | null;
  };
  ersteller: {
    id: number;
    name: string | null;
    email: string;
  };
  positionen: {
    id: number;
    zustand: string;
    zustandNotiz: string | null;
    vollstaendig: boolean;
    fehlendTeile: string | null;
    geraet: {
      id: number;
      inventarCode: string;
      sno: string;
      hwName: string | null;
      hsName: string | null;
      modName: string | null;
      preis: number | null;
    } | null;
    zubehoer: {
      id: number;
      typ: string | null;
      hersteller: string | null;
      modell: string | null;
      beschreibung: string | null;
    } | null;
  }[];
}

interface CurrentUser {
  id: number;
  name: string;
  role: string;
  permissions: string[];
}

interface SimpleUserOption {
  id: number;
  name: string;
}

interface SimpleDeptOption {
  id: number;
  name: string;
}

export default function ProtokollDetailPage() {
  const params = useParams();
  const router = useRouter();
  const protocolId = params.id as string;

  const [protocol, setProtocol] = useState<ProtocolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [tasksDraft, setTasksDraft] = useState<
    {
      id: number | null;
      titel: string;
      beschreibung: string | null;
      faelligAm: string | null;
      status: string;
      assignedBenutzerId: number | null;
      assignedAbteilungId: number | null;
    }[]
  >([]);
  const [tasksSaving, setTasksSaving] = useState(false);
  const [tasksMessage, setTasksMessage] = useState<string | null>(null);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [userOptions, setUserOptions] = useState<SimpleUserOption[]>([]);
  const [deptOptions, setDeptOptions] = useState<SimpleDeptOption[]>([]);

  // Unterschrift
  const [showSignModal, setShowSignModal] = useState(false);
  const [signType, setSignType] = useState<'mitarbeiter' | 'it'>('mitarbeiter');
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Aktionen
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const canSign =
    currentUser?.permissions?.includes('protocols:sign') || currentUser?.role === 'ADMIN';
  const canEdit =
    currentUser?.permissions?.includes('protocols:edit') || currentUser?.role === 'ADMIN';

  const protocolIdNumber = Number(protocolId);
  const isValidProtocolId = Number.isInteger(protocolIdNumber) && protocolIdNumber > 0;

  useEffect(() => {
    if (!isValidProtocolId) {
      if (protocolId === 'aufgaben') {
        router.replace('/protokolle/aufgaben');
      } else {
        router.replace('/protokolle');
      }
      return;
    }
    fetchCurrentUser();
    fetchProtocol();
  }, [protocolId]);

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

  const fetchProtocol = async () => {
    try {
      setLoading(true);
      if (!isValidProtocolId) return;
      const res = await fetch(`/api/protocols/${protocolId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Protokoll nicht gefunden');
        throw new Error('Fehler beim Laden');
      }
      const data = await res.json();
      setProtocol(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (protocol) {
      setTasksDraft(
        (protocol.aufgaben || []).map((t) => ({
          id: t.id,
          titel: t.titel,
          beschreibung: t.beschreibung ?? '',
          faelligAm: t.faelligAm ? t.faelligAm.slice(0, 10) : null,
          status: t.status || 'OFFEN',
          assignedBenutzerId: t.assignedBenutzerId,
          assignedAbteilungId: t.assignedAbteilungId,
        })),
      );
    }
  }, [protocol]);

  useEffect(() => {
    // Benutzer-Optionen
    fetch('/api/tables/Benutzer')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Benutzer konnten nicht geladen werden'))))
      .then((data) => {
        const rows = (data?.data as any[]) ?? [];
        setUserOptions(rows.map((r) => ({ id: r.BenutzerID, name: r.BenutzerName || `Benutzer #${r.BenutzerID}` })));
      })
      .catch(() => setUserOptions([]));

    // Abteilungen
    fetch('/api/tables/ABT')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Abteilungen konnten nicht geladen werden'))))
      .then((data) => {
        const rows = (data?.data as any[]) ?? [];
        setDeptOptions(rows.map((r) => ({ id: r.ABTID, name: r.ABTName || `Abteilung #${r.ABTID}` })));
      })
      .catch(() => setDeptOptions([]));
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getTypLabel = (typ: string) => {
    switch (typ) {
      case 'AUSGABE': return 'Geräteausgabe';
      case 'RUECKGABE': return 'Geräterückgabe';
      case 'TAUSCH': return 'Gerätetausch';
      default: return typ;
    }
  };

  const getTypIcon = (typ: string) => {
    switch (typ) {
      case 'AUSGABE': return <ArrowUpRight className="w-5 h-5 text-emerald-600" />;
      case 'RUECKGABE': return <ArrowDownLeft className="w-5 h-5 text-amber-600" />;
      case 'TAUSCH': return <Repeat className="w-5 h-5 text-blue-600" />;
      default: return <ClipboardList className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ENTWURF':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <FileEdit className="w-3.5 h-3.5" /> Entwurf
          </span>
        );
      case 'OFFEN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Clock className="w-3.5 h-3.5" /> Offen
          </span>
        );
      case 'UNTERSCHRIEBEN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" /> Unterschrieben
          </span>
        );
      case 'ARCHIVIERT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Archive className="w-3.5 h-3.5" /> Archiviert
          </span>
        );
      default:
        return <span className="text-xs text-gray-600">{status}</span>;
    }
  };

  const getZustandLabel = (zustand: string) => {
    const labels: Record<string, { text: string; color: string }> = {
      NEU: { text: 'Neu', color: 'text-emerald-600' },
      GUT: { text: 'Gut', color: 'text-emerald-600' },
      GEBRAUCHSSPUREN: { text: 'Gebrauchsspuren', color: 'text-amber-600' },
      BESCHAEDIGT: { text: 'Beschädigt', color: 'text-red-600' },
    };
    const l = labels[zustand] || { text: zustand, color: 'text-gray-600' };
    return <span className={l.color}>{l.text}</span>;
  };

  // Unterschrift Canvas
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const openSignModal = (type: 'mitarbeiter' | 'it') => {
    setSignType(type);
    setShowSignModal(true);
    setSignError(null);
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.strokeStyle = '#1a1a1a';
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
      }
    }, 100);
  };

  const submitSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const signatur = canvas.toDataURL('image/png');

    setSigning(true);
    setSignError(null);

    try {
      const res = await fetch(`/api/protocols/${protocolId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ typ: signType, signatur }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Speichern');
      }

      setShowSignModal(false);
      await fetchProtocol();
    } catch (err) {
      setSignError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setSigning(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Möchten Sie dieses Protokoll wirklich löschen?')) return;

    setDeleting(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/protocols/${protocolId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Löschen');
      }
      router.push('/protokolle');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setDeleting(false);
    }
  };

  const handlePrint = () => {
    const pdfWindow = window.open(`/api/protocols/${protocolId}/pdf`, '_blank');
    if (pdfWindow) {
      pdfWindow.onload = () => pdfWindow.print();
    }
  };

  const handleTaskChange = (
    idx: number,
    field: 'titel' | 'beschreibung' | 'faelligAm' | 'status' | 'assignedBenutzerId' | 'assignedAbteilungId',
    value: string | null | number,
  ) => {
    setTasksDraft((prev) => prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)));
  };

  const handleAddTask = () => {
    setTasksDraft((prev) => [
      ...prev,
      {
        id: null,
        titel: 'Neue Aufgabe',
        beschreibung: '',
        faelligAm: null,
        status: 'OFFEN',
        assignedBenutzerId: null,
        assignedAbteilungId: null,
      },
    ]);
  };

  const handleRemoveTask = (idx: number) => {
    setTasksDraft((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAssignUser = (idx: number, value: string) => {
    const id = value ? Number(value) : null;
    setTasksDraft((prev) =>
      prev.map((t, i) =>
        i === idx
          ? {
              ...t,
              assignedBenutzerId: id,
              assignedAbteilungId: null,
            }
          : t,
      ),
    );
  };

  const handleAssignDept = (idx: number, value: string) => {
    const id = value ? Number(value) : null;
    setTasksDraft((prev) =>
      prev.map((t, i) =>
        i === idx
          ? {
              ...t,
              assignedAbteilungId: id,
              assignedBenutzerId: null,
            }
          : t,
      ),
    );
  };

  const handleSaveTasks = async () => {
    if (!protocol) return;
    setTasksSaving(true);
    setTasksMessage(null);
    setTasksError(null);
    try {
      const payload = {
        aufgaben: tasksDraft.map((t, i) => ({
          titel: t.titel.trim() || `Aufgabe ${i + 1}`,
          beschreibung: t.beschreibung?.trim() || null,
          faelligAm: t.faelligAm || null,
          status: t.status || 'OFFEN',
        })),
      };
      const res = await fetch(`/api/protocols/${protocol.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Speichern fehlgeschlagen');
      }
      setTasksMessage('Aufgaben gespeichert');
      await fetchProtocol();
    } catch (err) {
      setTasksError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setTasksSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !protocol) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-gray-900 mb-2">{error || 'Nicht gefunden'}</h1>
          <button
            onClick={() => router.push('/protokolle')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark mt-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  const geraete = protocol.positionen.filter((p) => p.geraet);
  const zubehoer = protocol.positionen.filter((p) => p.zubehoer);
  const canBeDeleted = protocol.status === 'ENTWURF' && canEdit;
  const canBeSigned = (protocol.status === 'ENTWURF' || protocol.status === 'OFFEN') && canSign;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/protokolle')}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">{getTypIcon(protocol.typ)}</div>
              <div>
                <h1 className="text-sm font-semibold text-primary-dark">{protocol.protokollNr}</h1>
                <p className="text-xs text-gray-500">{getTypLabel(protocol.typ)}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              title="PDF drucken"
            >
              <Printer className="w-5 h-5" />
            </button>
            <a
              href={`/api/protocols/${protocolId}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              title="PDF herunterladen"
            >
              <Download className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
          {/* Status & Aktionen */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                {getStatusBadge(protocol.status)}
                <span className="text-sm text-gray-500">
                  Erstellt am {formatDate(protocol.erstelltAm)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {canBeSigned && !protocol.unterschriftMitarbeiter && (
                  <button
                    onClick={() => openSignModal('mitarbeiter')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    Mitarbeiter unterschreiben
                  </button>
                )}
                {canBeSigned && !protocol.unterschriftIT && (
                  <button
                    onClick={() => openSignModal('it')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    IT unterschreiben
                  </button>
                )}
                {canBeDeleted && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {deleting ? 'Löschen...' : 'Löschen'}
                  </button>
                )}
              </div>
            </div>
            {actionError && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                {actionError}
              </div>
            )}
          </div>

          {/* Mitarbeiter-Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-primary" />
              Mitarbeiter
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500 text-xs">Name</div>
                <div className="font-medium">{protocol.benutzer.name || '—'}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">Abteilung</div>
                <div className="font-medium">{protocol.benutzer.abteilung || '—'}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">Standort</div>
                <div className="font-medium">{protocol.benutzer.geschaeftsstelle || '—'}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs">Raum</div>
                <div className="font-medium">{protocol.benutzer.raum || '—'}</div>
              </div>
            </div>
          </div>

          {/* Geräte */}
          {geraete.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <MonitorSmartphone className="w-4 h-4 text-primary" />
                Geräte ({geraete.length})
              </h2>
              <div className="space-y-3">
                {geraete.map((pos) => (
                  <div key={pos.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold text-primary-dark">
                          {pos.geraet!.inventarCode}
                        </div>
                        <div className="text-sm text-gray-700">
                          {[pos.geraet!.hwName, pos.geraet!.hsName, pos.geraet!.modName]
                            .filter(Boolean)
                            .join(' ')}
                        </div>
                        <div className="text-xs text-gray-500">SNO: {pos.geraet!.sno}</div>
                      </div>
                      <div className="text-right text-sm">
                        <div>Zustand: {getZustandLabel(pos.zustand)}</div>
                        {!pos.vollstaendig && (
                          <div className="text-red-600 text-xs">
                            Unvollständig: {pos.fehlendTeile}
                          </div>
                        )}
                      </div>
                    </div>
                    {pos.zustandNotiz && (
                      <div className="mt-2 text-xs text-gray-500 bg-white p-2 rounded">
                        Notiz: {pos.zustandNotiz}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Zubehör */}
          {zubehoer.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-amber-600" />
                Zubehör ({zubehoer.length})
              </h2>
              <div className="space-y-2">
                {zubehoer.map((pos) => (
                  <div key={pos.id} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                    <div className="text-sm">
                      {[pos.zubehoer!.typ, pos.zubehoer!.hersteller, pos.zubehoer!.modell]
                        .filter(Boolean)
                        .join(' ')}
                      {pos.zubehoer!.beschreibung && (
                        <span className="text-gray-500 ml-2">({pos.zubehoer!.beschreibung})</span>
                      )}
                    </div>
                    <div className="text-sm">{getZustandLabel(pos.zustand)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aufgaben verwalten */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-primary" />
                  Aufgaben
                </h2>
                <p className="text-xs text-gray-600">
                  Aufgaben zum Protokoll ansehen und bearbeiten.
                </p>
                {!canEdit || protocol.status !== 'ENTWURF' ? (
                  <p className="text-xs text-amber-600 mt-1">
                    Bearbeitung nur bei Entwürfen und mit Bearbeitungsrecht möglich.
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={fetchProtocol}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Neu laden
                </button>
                <button
                  type="button"
                  onClick={handleAddTask}
                  disabled={!canEdit || protocol.status !== 'ENTWURF'}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-primary/100 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Aufgabe hinzufügen
                </button>
                <button
                  type="button"
                  onClick={handleSaveTasks}
                  disabled={!canEdit || protocol.status !== 'ENTWURF' || tasksSaving}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary-dark hover:bg-primary/10 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {tasksSaving ? 'Speichern...' : 'Aufgaben speichern'}
                </button>
              </div>
            </div>

            {(tasksMessage || tasksError) && (
              <div
                className={`rounded-lg border p-3 text-xs ${
                  tasksError ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`}
              >
                {tasksError || tasksMessage}
              </div>
            )}

            {tasksDraft.length === 0 ? (
              <div className="text-sm text-gray-500">Keine Aufgaben hinterlegt.</div>
            ) : (
              <div className="space-y-3">
                {tasksDraft.map((task, idx) => (
                  <div
                    key={`${task.id ?? 'neu'}-${idx}`}
                    className="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                          <input
                            type="text"
                            value={task.titel}
                            disabled={!canEdit || protocol.status !== 'ENTWURF'}
                            onChange={(e) => handleTaskChange(idx, 'titel', e.target.value)}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500"
                            placeholder="Titel der Aufgabe"
                          />
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary-dark">
                              Task #{idx + 1}
                            </span>
                            {task.faelligAm && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                                Fällig: {formatDate(task.faelligAm)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Beschreibung</label>
                            <textarea
                              value={task.beschreibung ?? ''}
                              disabled={!canEdit || protocol.status !== 'ENTWURF'}
                              onChange={(e) => handleTaskChange(idx, 'beschreibung', e.target.value)}
                              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500"
                              rows={2}
                              placeholder="Details oder Checkliste"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Fällig am</label>
                            <input
                              type="date"
                              value={task.faelligAm ?? ''}
                              disabled={!canEdit || protocol.status !== 'ENTWURF'}
                              onChange={(e) => handleTaskChange(idx, 'faelligAm', e.target.value || null)}
                              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500"
                            />
                            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                            <select
                              value={task.status}
                              disabled={!canEdit || protocol.status !== 'ENTWURF'}
                              onChange={(e) => handleTaskChange(idx, 'status', e.target.value)}
                              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500"
                            >
                              <option value="OFFEN">Offen</option>
                              <option value="IN_ARBEIT">In Arbeit</option>
                              <option value="ERLEDIGT">Erledigt</option>
                            </select>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Zuweisung</label>
                            <div className="space-y-1">
                              <select
                                value={task.assignedBenutzerId ?? ''}
                                disabled={!canEdit || protocol.status !== 'ENTWURF'}
                                onChange={(e) => handleAssignUser(idx, e.target.value)}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500"
                              >
                                <option value="">Kein Benutzer</option>
                                {userOptions.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.name}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={task.assignedAbteilungId ?? ''}
                                disabled={!canEdit || protocol.status !== 'ENTWURF'}
                                onChange={(e) => handleAssignDept(idx, e.target.value)}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-500"
                              >
                                <option value="">Keine Abteilung</option>
                                {deptOptions.map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.name}
                                  </option>
                                ))}
                              </select>
                              <p className="text-[11px] text-gray-500">
                                Wähle entweder einen Benutzer oder eine Abteilung. Abteilung wirkt für alle Mitglieder.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 self-start">
                        <button
                          type="button"
                          onClick={() => handleRemoveTask(idx)}
                          disabled={!canEdit || protocol.status !== 'ENTWURF'}
                          className="inline-flex items-center gap-2 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Entfernen
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bemerkungen */}
          {protocol.bemerkung && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Bemerkungen</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{protocol.bemerkung}</p>
            </div>
          )}

          {/* Unterschriften */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <PenTool className="w-4 h-4 text-primary" />
              Unterschriften
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-2">Mitarbeiter/in</div>
                <div className="h-20 border border-dashed border-gray-200 rounded bg-gray-50 flex items-center justify-center">
                  {protocol.unterschriftMitarbeiter ? (
                    <img
                      src={protocol.unterschriftMitarbeiter}
                      alt="Unterschrift Mitarbeiter"
                      className="max-h-full max-w-full"
                    />
                  ) : (
                    <span className="text-xs text-gray-400">Noch nicht unterschrieben</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-2 text-center">
                  {protocol.benutzer.name}
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-2">IT-Abteilung</div>
                <div className="h-20 border border-dashed border-gray-200 rounded bg-gray-50 flex items-center justify-center">
                  {protocol.unterschriftIT ? (
                    <img
                      src={protocol.unterschriftIT}
                      alt="Unterschrift IT"
                      className="max-h-full max-w-full"
                    />
                  ) : (
                    <span className="text-xs text-gray-400">Noch nicht unterschrieben</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-2 text-center">
                  {protocol.ersteller.name || protocol.ersteller.email}
                </div>
              </div>
            </div>
            {protocol.unterschriftDatum && (
              <div className="mt-3 text-xs text-gray-500 text-center">
                Unterschrieben am {formatDate(protocol.unterschriftDatum)}
              </div>
            )}
          </div>

          {/* Ersteller-Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-500">
              Erstellt von <span className="font-medium">{protocol.ersteller.name || protocol.ersteller.email}</span> am {formatDate(protocol.erstelltAm)}
            </div>
          </div>
        </div>
      </main>

      {/* Unterschrift-Modal */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSignModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {signType === 'mitarbeiter' ? 'Mitarbeiter-Unterschrift' : 'IT-Unterschrift'}
            </h3>

            <div className="border border-gray-300 rounded-lg overflow-hidden mb-4 bg-gray-50">
              <canvas
                ref={canvasRef}
                width={360}
                height={150}
                className="w-full touch-none cursor-crosshair bg-white"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>

            <div className="text-xs text-gray-500 mb-4">
              Bitte unterschreiben Sie im Feld oben mit der Maus oder dem Finger.
            </div>

            {signError && (
              <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                {signError}
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={clearCanvas}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Löschen
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSignModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={submitSignature}
                  disabled={signing}
                  className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                >
                  {signing ? 'Speichern...' : 'Unterschrift speichern'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
