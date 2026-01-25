'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Table,
  Link2,
  RefreshCw,
  Search,
  Database,
  MonitorSmartphone,
  Boxes,
  QrCode,
  ClipboardList,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
} from 'lucide-react';
import TableView from './TableView';
import LandingPageScanModule from './LandingPageScanModule';
import InventoryModeToggle from './InventoryModeToggle';

const iconMap = {
  MonitorSmartphone,
  Boxes,
  QrCode,
  ClipboardList,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
};

type IconName = keyof typeof iconMap;

interface Feature {
  href: string;
  label: string;
  description: string;
  icon: IconName;
  show: boolean;
}

interface QuickAction {
  href: string;
  label: string;
  icon: IconName;
  primary: boolean;
  show: boolean;
}

interface TableInfo {
  name: string;
  displayName: string;
  primaryKey: string;
}

interface DashboardClientProps {
  features: Feature[];
  quickActions: QuickAction[];
}

export default function DashboardClient({ features, quickActions }: DashboardClientProps) {
  const [view, setView] = useState<'dashboard' | 'rawdata'>('dashboard');
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [loadingTables, setLoadingTables] = useState(true);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [tableFilter, setTableFilter] = useState('');

  useEffect(() => {
    if (view === 'rawdata') {
      fetchTables();
    }
  }, [view]);

  const fetchTables = async () => {
    try {
      setLoadingTables(true);
      const res = await fetch('/api/tables');
      if (!res.ok) throw new Error('Fehler beim Laden der Tabellen');
      const data: TableInfo[] = await res.json();
      setTables(data);
      setTablesError(null);
    } catch (err) {
      setTablesError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoadingTables(false);
    }
  };

  const filteredTables = tables.filter((table) => {
    if (!tableFilter) return true;
    const term = tableFilter.toLowerCase();
    return (
      table.displayName.toLowerCase().includes(term) ||
      table.name.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1 flex flex-col">
        <header className="border-b bg-white/80 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary rounded-lg shadow-sm">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-base font-semibold text-gray-900">Inventar-Verwaltung</h1>
                    <p className="text-xs text-gray-500">Schnellzugriff auf Inventar, Scans und Prozesse</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setView('dashboard')}
                    className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                      view === 'dashboard'
                        ? 'bg-primary text-white border-primary/30'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Übersicht
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('rawdata')}
                    className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                      view === 'rawdata'
                        ? 'bg-primary text-white border-primary/30'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    Rohdaten
                  </button>
                </div>
              </div>

              {view === 'dashboard' && features.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {features.map((feature) => {
                    const Icon = iconMap[feature.icon];
                    return (
                      <Link
                        key={feature.href}
                        href={feature.href}
                        className="text-left rounded-xl border border-gray-200 bg-white p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{feature.label}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{feature.description}</div>
                          </div>
                          <div className="p-2 rounded-lg bg-primary/10 text-primary-dark">
                            <Icon className="w-5 h-5" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </header>

        {view === 'dashboard' && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Inventur-Modus Toggle & Scan-Modul */}
            <InventoryModeToggle />
            <LandingPageScanModule />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {quickActions.length > 0 && (
                <div className="md:col-span-2 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Schnellaktionen</div>
                      <div className="text-xs text-gray-500 mt-0.5">Die häufigsten Workflows in 1 Klick</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    {quickActions.map((action) => {
                      const Icon = iconMap[action.icon];
                      return (
                        <Link
                          key={action.href}
                          href={action.href}
                          className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm ${
                            action.primary
                              ? 'bg-primary text-white hover:bg-primary-dark'
                              : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {action.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-sm font-semibold text-gray-900">Rohdaten</div>
                <div className="text-xs text-gray-500 mt-0.5">Tabellen direkt ansehen/bearbeiten</div>
                <button
                  type="button"
                  onClick={() => setView('rawdata')}
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm hover:bg-gray-50"
                >
                  <Table className="w-4 h-4" />
                  Zu den Rohdaten
                </button>
              </div>
            </div>
          </section>
        )}

        {view === 'rawdata' && (
          <div className="flex flex-1">
            <aside className="w-72 bg-white border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tabelle suchen..."
                    value={tableFilter}
                    onChange={(e) => setTableFilter(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <nav className="flex-1 overflow-y-auto p-2">
                <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Tabellen
                </p>
                {loadingTables ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
                  </div>
                ) : tablesError ? (
                  <div className="px-3 py-2 text-sm text-red-600">{tablesError}</div>
                ) : (
                  <ul className="space-y-1">
                    {filteredTables.map((table) => (
                      <li key={table.name}>
                        <button
                          onClick={() => setSelectedTable(table.name)}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                            selectedTable === table.name
                              ? 'bg-primary/20 text-primary-dark font-medium'
                              : 'text-gray-700 hover:bg-primary/20'
                          }`}
                        >
                          <Table className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{table.displayName}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </nav>
            </aside>

            <section className="flex-1 flex flex-col">
              {selectedTable ? (
                <TableView tableName={selectedTable} />
              ) : (
                <div className="flex-1 flex items-center justify-center px-4">
                  <div className="text-center max-w-xl">
                    <Link2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-700 mb-2">
                      Wähle links eine Tabelle aus, um zu starten
                    </h2>
                    <p className="text-gray-500 mb-2">
                      Nutze die Tabellenübersicht in der linken Leiste, um Stammdaten, Inventar oder Zuordnungen in
                      ihrer Rohform anzuzeigen und zu bearbeiten.
                    </p>
                    <p className="text-xs text-gray-400">
                      Tipp: Die Geräteverwaltung erreichst du jederzeit über die Navigationsleiste oben.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
