'use client';

import { useEffect, useState } from 'react';
import { Users, MonitorSmartphone, Package, Search, ChevronDown, ChevronUp, Mail, Building2, MapPin } from 'lucide-react';
import Link from 'next/link';

interface Device {
  id: number;
  inventarCode: string;
  sno: string | null;
  hwName: string | null;
  hsName: string | null;
  modelName: string | null;
  zugang: string;
  preis: number | null;
}

interface Accessory {
  id: number;
  label: string;
  type: string | null;
  start: string | null;
}

interface Employee {
  id: number;
  name: string | null;
  email: string | null;
  abteilung: string | null;
  geschaeftsstelle: string | null;
  raum: string | null;
  devices: Device[];
  accessories: Accessory[];
}

export default function MitarbeiterGeraetePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'devices' | 'department'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/employees/devices');
      if (!res.ok) throw new Error('Fehler beim Laden der Mitarbeiterdaten');
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatPrice = (price?: number | null) => {
    if (price == null) return '—';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  };

  const filteredEmployees = employees.filter((emp) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      emp.name?.toLowerCase().includes(term) ||
      emp.email?.toLowerCase().includes(term) ||
      emp.abteilung?.toLowerCase().includes(term) ||
      emp.geschaeftsstelle?.toLowerCase().includes(term) ||
      emp.devices.some((d) => d.inventarCode.toLowerCase().includes(term))
    );
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = (a.name || '').localeCompare(b.name || '', 'de-DE');
        break;
      case 'devices':
        comparison = a.devices.length - b.devices.length;
        break;
      case 'department':
        comparison = (a.abteilung || '').localeCompare(b.abteilung || '', 'de-DE');
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const toggleEmployee = (id: number) => {
    setExpandedEmployeeId(expandedEmployeeId === id ? null : id);
  };

  const handleSort = (field: 'name' | 'devices' | 'department') => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const totalDevices = employees.reduce((sum, emp) => sum + emp.devices.length, 0);
  const totalAccessories = employees.reduce((sum, emp) => sum + emp.accessories.length, 0);
  const employeesWithDevices = employees.filter((emp) => emp.devices.length > 0).length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg shadow-sm">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-semibold text-gray-900">Mitarbeiter-Geräteübersicht</h1>
              <p className="text-xs text-gray-500">Alle zugewiesenen Geräte und Zubehör pro Mitarbeiter</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Statistiken */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Mitarbeiter mit Geräten</p>
                  <p className="text-2xl font-bold text-gray-900">{employeesWithDevices}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <MonitorSmartphone className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Zugewiesene Geräte</p>
                  <p className="text-2xl font-bold text-gray-900">{totalDevices}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Package className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Zugewiesenes Zubehör</p>
                  <p className="text-2xl font-bold text-gray-900">{totalAccessories}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Suche und Sortierung */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Mitarbeiter, Abteilung oder Inventarcode suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSort('name')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border ${
                    sortBy === 'name'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Name {sortBy === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  type="button"
                  onClick={() => handleSort('devices')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border ${
                    sortBy === 'devices'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Geräte {sortBy === 'devices' && (sortDirection === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  type="button"
                  onClick={() => handleSort('department')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border ${
                    sortBy === 'department'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Abteilung {sortBy === 'department' && (sortDirection === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            </div>
          </div>

          {/* Mitarbeiterliste */}
          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-500">Lade Mitarbeiterdaten...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : sortedEmployees.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-500">Keine Mitarbeiter gefunden</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedEmployees.map((employee) => (
                <div key={employee.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleEmployee(employee.id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Users className="w-4 h-4 text-primary-dark" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {employee.name || `Mitarbeiter #${employee.id}`}
                          </span>
                          {employee.devices.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                              {employee.devices.length} Gerät{employee.devices.length !== 1 ? 'e' : ''}
                            </span>
                          )}
                          {employee.accessories.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                              {employee.accessories.length} Zubehör
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                          {employee.email && (
                            <span key={`email-${employee.id}`} className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {employee.email}
                            </span>
                          )}
                          {employee.abteilung && (
                            <span key={`dept-${employee.id}`} className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {employee.abteilung}
                            </span>
                          )}
                          {employee.raum && (
                            <span key={`room-${employee.id}`} className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {employee.raum}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {expandedEmployeeId === employee.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {expandedEmployeeId === employee.id && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      {employee.devices.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <MonitorSmartphone className="w-3 h-3" />
                            Geräte
                          </h4>
                          <div className="space-y-2">
                            {employee.devices.map((device) => (
                              <Link
                                key={device.id}
                                href={`/geraete/${device.inventarCode}`}
                                className="block p-3 bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-sm transition-all"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-semibold text-gray-900">
                                        {device.inventarCode}
                                      </span>
                                      {device.hwName && (
                                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">
                                          {device.hwName}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-600 space-y-0.5">
                                      {device.hsName && device.modelName && (
                                        <p>{device.hsName} · {device.modelName}</p>
                                      )}
                                      {device.sno && <p>S/N: {device.sno}</p>}
                                      <p>Zugang: {formatDate(device.zugang)}</p>
                                    </div>
                                  </div>
                                  {device.preis != null && (
                                    <div className="text-right">
                                      <p className="text-xs text-gray-500">Wert</p>
                                      <p className="text-sm font-semibold text-gray-900">
                                        {formatPrice(device.preis)}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {employee.accessories.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Package className="w-3 h-3" />
                            Zubehör
                          </h4>
                          <div className="space-y-2">
                            {employee.accessories.map((accessory) => (
                              <div
                                key={accessory.id}
                                className="p-3 bg-white rounded-lg border border-gray-200"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {accessory.label}
                                    </p>
                                    {accessory.type && (
                                      <p className="text-xs text-gray-500">{accessory.type}</p>
                                    )}
                                  </div>
                                  {accessory.start && (
                                    <p className="text-xs text-gray-500">
                                      Seit {formatDate(accessory.start)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {employee.devices.length === 0 && employee.accessories.length === 0 && (
                        <p className="text-xs text-gray-500 italic text-center py-4">
                          Keine Geräte oder Zubehör zugewiesen
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
