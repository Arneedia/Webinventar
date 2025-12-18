'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  ClipboardList,
  Plus,
  RefreshCw,
  FileText,
  CheckCircle2,
  Clock,
  FileEdit,
  Archive,
  Search,
  User,
  Calendar,
  Printer,
} from 'lucide-react';

interface ProtocolListItem {
  id: number;
  protokollNr: string;
  typ: string;
  status: string;
  erstelltAm: string;
  unterschriftDatum: string | null;
  bemerkung: string | null;
  benutzer: {
    id: number;
    name: string | null;
    abteilung: string | null;
    geschaeftsstelle: string | null;
    raum: string | null;
  };
  ersteller: {
    id: number;
    name: string | null;
    email: string;
  };
  positionen: {
    id: number;
    geraet: { inventarCode: string } | null;
    zubehoer: { typ: string | null } | null;
  }[];
  hatUnterschriftMitarbeiter: boolean;
  hatUnterschriftIT: boolean;
}

interface CurrentUser {
  id: number;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

export default function OnboardingPage() {
  const router = useRouter();
  const [protocols, setProtocols] = useState<ProtocolListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const canCreate =
    currentUser?.permissions?.includes('protocols:create') || currentUser?.role === 'ADMIN';
  const canEdit =
    currentUser?.permissions?.includes('protocols:edit') || currentUser?.role === 'ADMIN';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const typFilter = 'AUSGABE';

  useEffect(() => {
    fetchCurrentUser();
    fetchProtocols();
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

  const fetchProtocols = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      params.set('typ', typFilter);

      const res = await fetch(`/api/protocols?${params.toString()}`);
      if (!res.ok) throw new Error('Fehler beim Laden der Protokolle');
      const data = await res.json();
      setProtocols(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProtocols();
  }, [statusFilter]);

  const filteredProtocols = useMemo(() => {
    return protocols.filter((p) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        p.protokollNr.toLowerCase().includes(term) ||
        p.benutzer.name?.toLowerCase().includes(term) ||
        p.ersteller.name?.toLowerCase().includes(term)
      );
    });
  }, [protocols, searchTerm]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ENTWURF':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">
            <FileEdit className="w-3 h-3" />
            Entwurf
          </span>
        );
      case 'OFFEN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary-dark">
            <Clock className="w-3 h-3" />
            Offen
          </span>
        );
      case 'UNTERSCHRIEBEN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary-dark">
            <CheckCircle2 className="w-3 h-3" />
            Unterschrieben
          </span>
        );
      case 'ARCHIVIERT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
            <Archive className="w-3 h-3" />
            Archiviert
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handlePrintPdf = async (protocolId: number) => {
    const pdfWindow = window.open(`/api/protocols/${protocolId}/pdf`, '_blank');
    if (pdfWindow) {
      pdfWindow.onload = () => {
        pdfWindow.print();
      };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-primary rounded-lg shadow-sm">
              <ArrowUpRight className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-semibold text-gray-900">Onboarding</h1>
              <p className="text-xs text-gray-500">Geräteausgabe & Start-Checkliste</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
            {canEdit && (
              <button
                type="button"
                onClick={() => router.push('/protokolle/aufgaben')}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
              >
                <ClipboardList className="w-4 h-4" />
                Aufgaben-Vorlagen
              </button>
            )}
            {canCreate && (
              <button
                type="button"
                onClick={() => router.push('/onboarding/neu')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark"
              >
                <Plus className="w-4 h-4" />
                Neues Onboarding
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Suche nach Protokoll-Nr., Mitarbeiter..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none bg-white"
                >
                  <option value="">Alle Status</option>
                  <option value="ENTWURF">Entwurf</option>
                  <option value="OFFEN">Offen</option>
                  <option value="UNTERSCHRIEBEN">Unterschrieben</option>
                  <option value="ARCHIVIERT">Archiviert</option>
                </select>
                <button
                  type="button"
                  onClick={fetchProtocols}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  title="Aktualisieren"
                >
                  <RefreshCw className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {filteredProtocols.length} Protokoll{filteredProtocols.length !== 1 ? 'e' : ''}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : error ? (
              <div className="p-6 text-center text-red-600">{error}</div>
            ) : filteredProtocols.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Keine Onboarding-Protokolle vorhanden</p>
                {canCreate && (
                  <button
                    type="button"
                    onClick={() => router.push('/onboarding/neu')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark"
                  >
                    <Plus className="w-4 h-4" />
                    Erstes Onboarding erstellen
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredProtocols.map((protocol) => (
                  <div
                    key={protocol.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/protokolle/${protocol.id}`)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                          <ArrowUpRight className="w-4 h-4 text-primary-dark" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">{protocol.protokollNr}</span>
                            {getStatusBadge(protocol.status)}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-600 mb-1">
                            <span className="inline-flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {protocol.benutzer.name || 'Unbekannt'}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(protocol.erstelltAm)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {protocol.positionen.length} Position
                            {protocol.positionen.length !== 1 ? 'en' : ''}
                            {protocol.benutzer.abteilung && (
                              <span className="ml-2">• {protocol.benutzer.abteilung}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintPdf(protocol.id);
                          }}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                          title="PDF drucken"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
