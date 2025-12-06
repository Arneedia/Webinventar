'use client';

import { useState, useEffect } from 'react';
import { Table, Users, MonitorSmartphone, Boxes, Link2, RefreshCw, Search, Plus } from 'lucide-react';

// --- Domain-Interfaces ---

interface TableInfo {
  name: string;
  displayName: string;
  primaryKey: string;
}

interface ApiTableResponse {
  config: {
    name: string;
    displayName: string;
    primaryKey: string;
    columns: { name: string; type: string; nullable: boolean; identity?: boolean }[];
    foreignKeys?: { column: string; refTable: string; displayColumn: string }[];
  };
  data: Record<string, unknown>[];
}

// --- Reusable UI Components (OOP-like composition) ---

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description?: string;
}

function StatCard({ icon, label, value, description }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="p-2 rounded-lg bg-primary/10 text-primary-dark">
        {icon}
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <span className="text-lg font-semibold text-gray-900 leading-tight">{value}</span>
        {description && (
          <span className="text-[11px] text-gray-400 mt-0.5">{description}</span>
        )}
      </div>
    </div>
  );
}

interface TableSelectorProps {
  tables: TableInfo[];
  loading: boolean;
  error: string | null;
  selectedTable: string | null;
  onSelect: (tableName: string) => void;
}

function TableSelector({ tables, loading, error, selectedTable, onSelect }: TableSelectorProps) {
  const [filter, setFilter] = useState('');

  const filtered = tables.filter((table) => {
    if (!filter) return true;
    const term = filter.toLowerCase();
    return (
      table.displayName.toLowerCase().includes(term) ||
      table.name.toLowerCase().includes(term)
    );
  });

  return (
    <section className="border-b bg-white/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Tabellenübersicht</h2>
            <p className="text-xs text-gray-500">
              Wähle eine Tabelle aus, um Stammdaten, Inventar oder Zuordnungen zu verwalten.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tabellen filtern..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {loading ? (
            <div className="flex items-center justify-center py-3 text-xs text-gray-500">
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Tabellen werden geladen...
            </div>
          ) : error ? (
            <div className="text-sm text-red-600 py-2">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="text-xs text-gray-500 py-2">
              Keine Tabellen gefunden. Passe den Filter an.
            </div>
          ) : (
            filtered.map((table) => (
              <button
                key={table.name}
                onClick={() => onSelect(table.name)}
                className={`flex-shrink-0 px-3 py-2 rounded-lg border text-xs sm:text-sm flex items-center gap-2 transition-colors ${
                  selectedTable === table.name
                    ? 'bg-primary text-white border-primary/30 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Table className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="whitespace-nowrap">{table.displayName}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

interface TableHeaderProps {
  title: string;
  entryCount: number;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onCreate: () => void;
}

function TableHeader({ title, entryCount, searchTerm, onSearchChange, onRefresh, onCreate }: TableHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500">{entryCount} Einträge</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="In Tabelle suchen..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          onClick={onRefresh}
          className="p-2 text-gray-600 hover:bg-primary/20 rounded-lg transition-colors"
          title="Aktualisieren"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
        <button
          onClick={onCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Neu
        </button>
      </div>
    </header>
  );
}

// --- TableView & RecordForm (verwenden obige UI-Bausteine) ---

interface TableColumnConfig {
  name: string;
  type: string;
  nullable: boolean;
  identity?: boolean;
}

interface TableConfig {
  name: string;
  displayName: string;
  primaryKey: string;
  columns: TableColumnConfig[];
  foreignKeys?: { column: string; refTable: string; displayColumn: string }[];
}

function TableView({ tableName }: { tableName: string }) {
  const [config, setConfig] = useState<TableConfig | null>(null);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setShowForm(false);
      setEditingRow(null);
      const res = await fetch(`/api/tables/${tableName}`);
      if (!res.ok) throw new Error('Fehler beim Laden der Daten');
      const result: ApiTableResponse = await res.json();
      setConfig(result.config);
      setData(result.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (row: Record<string, unknown>) => {
    if (!config) return;
    if (!confirm('Möchtest du diesen Datensatz wirklich löschen?')) return;

    const pkColumns = config.primaryKey.split(',');
    const id = pkColumns.map(pk => row[pk.trim()]).join(',');

    try {
      const res = await fetch(`/api/tables/${tableName}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Fehler beim Löschen');
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  };

  const filteredData = data.filter(row => {
    if (!searchTerm) return true;
    return Object.values(row).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-primary-dark animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark">
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="flex flex-col flex-1 bg-gray-50">
      <TableHeader
        title={config.displayName}
        entryCount={data.length}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onRefresh={fetchData}
        onCreate={() => { setShowForm(true); setEditingRow(null); }}
      />

      <div className="flex-1 overflow-auto p-6">
        {showForm ? (
          <RecordForm
            config={config}
            initialData={editingRow}
            onSave={() => { setShowForm(false); fetchData(); }}
            onCancel={() => { setShowForm(false); setEditingRow(null); }}
          />
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {config.columns.map((col) => (
                      <th
                        key={col.name}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                      >
                        {col.name}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredData.map((row, idx) => {
                    const pkColumns = config.primaryKey.split(',');
                    const rowKey = pkColumns.map(pk => row[pk.trim()]).join('-');
                    return (
                      <tr key={rowKey || idx} className="hover:bg-gray-50 transition-colors">
                        {config.columns.map((col) => {
                          const displayKey = `${col.name}_Display`;
                          const displayValue = row[displayKey];
                          const value = row[col.name];
                          return (
                            <td key={col.name} className="px-4 py-3 text-sm text-gray-700">
                              {displayValue !== undefined ? (
                                <span title={String(value)}>
                                  {String(displayValue || '-')}
                                </span>
                              ) : (
                                formatValue(value, col.type)
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => { setEditingRow(row); setShowForm(true); }}
                            className="text-primary-dark hover:text-primary-dark text-sm font-medium mr-3"
                          >
                            Bearbeiten
                          </button>
                          <button
                            onClick={() => handleDelete(row)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Löschen
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan={config.columns.length + 1} className="px-4 py-8 text-center text-gray-500">
                        Keine Daten gefunden
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatValue(value: unknown, type: string): string {
  if (value === null || value === undefined) return '-';
  if (type === 'date') {
    const date = new Date(value as string);
    return date.toLocaleDateString('de-DE');
  }
  if (type === 'decimal') {
    return Number(value).toLocaleString('de-DE', { minimumFractionDigits: 2 });
  }
  return String(value);
}

interface RecordFormProps {
  config: TableConfig;
  initialData: Record<string, unknown> | null;
  onSave: () => void;
  onCancel: () => void;
}

function RecordForm({ config, initialData, onSave, onCancel }: RecordFormProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    if (initialData) return { ...initialData };
    const initial: Record<string, unknown> = {};
    config.columns.forEach(col => {
      initial[col.name] = '';
    });
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const isEdit = initialData !== null;
      let url = `/api/tables/${config.name}`;
      if (isEdit) {
        const pkColumns = config.primaryKey.split(',');
        const id = pkColumns.map(pk => initialData[pk.trim()]).join(',');
        url += `/${id}`;
      }

      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.details || data.error || 'Fehler beim Speichern');
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        {initialData ? 'Datensatz bearbeiten' : 'Neuer Datensatz'}
      </h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {config.columns.filter(col => !col.identity).map((col) => (
            <div key={col.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {col.name}
                {!col.nullable && <span className="text-red-500 ml-1">*</span>}
              </label>
              {col.type === 'date' ? (
                <input
                  type="date"
                  value={formData[col.name] ? String(formData[col.name]).split('T')[0] : ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, [col.name]: e.target.value || null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required={!col.nullable}
                />
              ) : col.type === 'int' || col.type === 'decimal' ? (
                <input
                  type="number"
                  step={col.type === 'decimal' ? '0.01' : '1'}
                  value={formData[col.name] !== null && formData[col.name] !== undefined ? String(formData[col.name]) : ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, [col.name]: e.target.value || null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required={!col.nullable}
                />
              ) : (
                <input
                  type="text"
                  value={String(formData[col.name] || '')}
                  onChange={(e) => setFormData(prev => ({ ...prev, [col.name]: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required={!col.nullable}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}

// --- Home Page (Composition der Komponenten) ---

export default function Home() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [loadingTables, setLoadingTables] = useState(true);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [tableFilter, setTableFilter] = useState('');

  useEffect(() => {
    fetchTables();
  }, []);

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

  const totalTables = tables.length;

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


        {/* Tabellen & Datenansicht mit linker Sidebar */}
        <div className="flex flex-1">
          {/* Linke Tabellen-Sidebar */}
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

          {/* Hauptbereich: Rohdaten-Ansicht */}
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
      </main>
    </div>
  );
}
