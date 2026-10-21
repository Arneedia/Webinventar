'use client';

import { useState, useEffect } from 'react';
import { apiError, readJsonSafe, throwApiError } from '@/lib/fetchError';
import { RefreshCw, Search, Plus } from 'lucide-react';

interface TableColumnConfig {
  name: string;
  type: string;
  nullable: boolean;
  identity?: boolean;
  defaultValue?: string;
  options?: { value: string; label: string }[];
}

interface TableConfig {
  name: string;
  displayName: string;
  primaryKey: string;
  columns: TableColumnConfig[];
  foreignKeys?: { column: string; refTable: string; displayColumn: string }[];
}

interface ApiTableResponse {
  config: TableConfig;
  data: Record<string, unknown>[];
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
      initial[col.name] = col.defaultValue ?? '';
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

      const data = await readJsonSafe(res);
      if (!res.ok) {
        throw apiError(url, res.status, data);
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
              {col.options ? (
                <select
                  value={String(formData[col.name] ?? '')}
                  onChange={(e) => setFormData(prev => ({ ...prev, [col.name]: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required={!col.nullable}
                >
                  {col.nullable && <option value="">-</option>}
                  {col.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : col.type === 'date' ? (
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

export default function TableView({ tableName }: { tableName: string }) {
  const [config, setConfig] = useState<TableConfig | null>(null);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, [tableName]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setShowForm(false);
      setEditingRow(null);
      const res = await fetch(`/api/tables/${tableName}`);
      if (!res.ok) await throwApiError(res, `/api/tables/${tableName}`, 'Fehler beim Laden der Daten');
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
      if (!res.ok) await throwApiError(res, `/api/tables/${tableName}/${id}`, 'Fehler beim Löschen');
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

  // Calculate pagination
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 sticky top-14 z-10">
        <div className="w-full">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight">{config.displayName}</h2>
          <p className="text-xs sm:text-sm text-gray-500">{data.length} Einträge</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="In Tabelle suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={fetchData}
            className="p-2 text-gray-600 hover:bg-primary/20 rounded-lg transition-colors shrink-0"
            title="Aktualisieren"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setShowForm(true); setEditingRow(null); }}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors shrink-0 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Neu</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {showForm ? (
          <RecordForm
            config={config}
            initialData={editingRow}
            onSave={() => { setShowForm(false); fetchData(); }}
            onCancel={() => { setShowForm(false); setEditingRow(null); }}
          />
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="hidden sm:block overflow-x-auto">
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
                  {paginatedData.map((row, idx) => {
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
                  {paginatedData.length === 0 && (
                    <tr>
                      <td colSpan={config.columns.length + 1} className="px-4 py-8 text-center text-gray-500">
                        Keine Daten gefunden
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Zeige {startIndex + 1} bis {Math.min(endIndex, filteredData.length)} von {filteredData.length} Einträgen
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Zurück
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 text-sm rounded-lg ${
                              currentPage === page
                                ? 'bg-primary text-white'
                                : 'border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return <span key={page} className="px-2 text-gray-400">...</span>;
                      }
                      return null;
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Weiter
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
