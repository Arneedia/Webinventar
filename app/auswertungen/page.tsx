'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Play, Download, Trash2, Save } from 'lucide-react';

type TableInfo = { name: string; displayName: string; primaryKey: string };

type ReportDefinitionV1 = {
  version: 1;
  table: string;
  selectColumns?: string[];
  searchTerm?: string;
  limit?: number;
  aggregation?:
    | { enabled: false }
    | { enabled: true; groupBy: string; op: 'count' | 'sum' | 'avg'; field?: string };
};

type ReportDefinitionV2 = {
  version: 2;
  table: string;
  selectColumns?: string[];
  searchTerm?: string;
  limit?: number;
  aggregation?:
    | { enabled: false }
    | { enabled: true; groupBy: string; op: 'count' | 'sum' | 'avg'; field?: string };
};

type ReportFilterOp = 'eq' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'isNull' | 'notNull';

type ReportFilter = {
  field: string;
  op: ReportFilterOp;
  value?: unknown;
  value2?: unknown;
};

type ReportSort = {
  field: string;
  dir: 'asc' | 'desc';
};

type ReportAggregationMeasure = {
  op: 'count' | 'sum' | 'avg' | 'min' | 'max';
  field?: string;
  as?: string;
};

type ReportDefinitionV3 = {
  version: 3;
  table: string;
  selectColumns?: string[];
  filters?: ReportFilter[];
  sort?: ReportSort;
  offset?: number;
  limit?: number;
  groupBy?: string;
  measures?: ReportAggregationMeasure[];
};

type AnyReportDefinition = ReportDefinitionV1 | ReportDefinitionV2 | ReportDefinitionV3;

type ReportListItem = {
  id: number;
  name: string;
  description: string | null;
  definition: any;
  updatedAt: string;
};

type ReportSchema = {
  name: string;
  displayName: string;
  primaryKey: string;
  columns: { name: string; type: string; nullable: boolean; identity?: boolean }[];
  joins?: {
    column: string;
    refTable: string;
    relationName: string;
    displayColumn: string;
    columns: { name: string; type: string; nullable: boolean; identity?: boolean }[];
  }[];
};

type ReportRunResult = {
  columns: string[];
  rows: Record<string, unknown>[];
};

const DEFAULT_DEF: ReportDefinitionV1 = {
  version: 1,
  table: 'GER',
  selectColumns: [],
  searchTerm: '',
  limit: 500,
  aggregation: { enabled: false },
};

const DEFAULT_DEF_V3: ReportDefinitionV3 = {
  version: 3,
  table: 'GER',
  selectColumns: [],
  filters: [],
  sort: undefined,
  offset: 0,
  limit: 200,
  groupBy: '',
  measures: [{ op: 'count', as: 'count' }],
};

export default function AuswertungenPage() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const selectedReport = useMemo(
    () => reports.find((r) => r.id === selectedReportId) ?? null,
    [reports, selectedReportId]
  );

  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftDef, setDraftDef] = useState<AnyReportDefinition>(DEFAULT_DEF);

  const [schema, setSchema] = useState<ReportSchema | null>(null);

  const [runLoading, setRunLoading] = useState(false);
  const [runResult, setRunResult] = useState<ReportRunResult | null>(null);

  useEffect(() => {
    void loadInitial();
  }, []);

  useEffect(() => {
    if (!selectedReport) return;
    setDraftName(selectedReport.name);
    setDraftDescription(selectedReport.description ?? '');
    const def = selectedReport.definition as any;
    setDraftDef(def && (def.version === 1 || def.version === 2 || def.version === 3) ? def : DEFAULT_DEF);
    setRunResult(null);
  }, [selectedReport]);

  useEffect(() => {
    if (!draftDef.table) return;
    void loadSchema(draftDef.table);
  }, [draftDef.table]);

  const loadInitial = async () => {
    try {
      setLoading(true);
      setError(null);

      const [tablesRes, reportsRes] = await Promise.all([
        fetch('/api/reports/tables', { cache: 'no-store' }),
        fetch('/api/reports', { cache: 'no-store' }),
      ]);

      const tablesData = await tablesRes.json();
      if (!tablesRes.ok) throw new Error(tablesData?.error || 'Tabellen konnten nicht geladen werden');
      setTables(Array.isArray(tablesData) ? tablesData : []);

      const reportsData = await reportsRes.json();
      if (!reportsRes.ok) throw new Error(reportsData?.error || 'Reports konnten nicht geladen werden');
      setReports(Array.isArray(reportsData) ? reportsData : []);

      if (Array.isArray(reportsData) && reportsData.length > 0) {
        setSelectedReportId(reportsData[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  const loadSchema = async (table: string) => {
    try {
      const res = await fetch(`/api/reports/schema/${encodeURIComponent(table)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Schema konnte nicht geladen werden');
      setSchema(data);

      setDraftDef((prev) => {
        const cols = prev.selectColumns ?? [];
        if (cols.length > 0) return prev;
        const defaultCols = (data?.columns ?? []).map((c: any) => c.name).slice(0, 12);
        return { ...prev, selectColumns: defaultCols };
      });
    } catch {
      setSchema(null);
    }
  };

  const createNewReport = async () => {
    try {
      setError(null);
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Neuer Report',
          description: '',
          definition: DEFAULT_DEF,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Konnte Report nicht erstellen');
      await loadInitial();
      setSelectedReportId(data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
    }
  };

  const saveReport = async () => {
    if (selectedReportId == null) return;
    try {
      setError(null);
      const res = await fetch(`/api/reports/${selectedReportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draftName,
          description: draftDescription,
          definition: draftDef,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Konnte nicht speichern');
      await loadInitial();
      setSelectedReportId(selectedReportId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
    }
  };

  const deleteReport = async () => {
    if (selectedReportId == null) return;
    if (!window.confirm('Report wirklich löschen?')) return;

    try {
      setError(null);
      const res = await fetch(`/api/reports/${selectedReportId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Konnte nicht löschen');
      await loadInitial();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
    }
  };

  const runReport = async () => {
    if (selectedReportId == null) return;
    try {
      setRunLoading(true);
      setError(null);
      const res = await fetch(`/api/reports/${selectedReportId}/run`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Konnte Report nicht ausführen');
      setRunResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
      setRunResult(null);
    } finally {
      setRunLoading(false);
    }
  };

  const selectedColumns = draftDef.selectColumns ?? [];
  const allColumns = schema?.columns?.map((c) => c.name) ?? [];

  const toggleColumn = (col: string) => {
    setDraftDef((prev) => {
      const set = new Set(prev.selectColumns ?? []);
      if (set.has(col)) set.delete(col);
      else set.add(col);
      return { ...prev, selectColumns: Array.from(set) };
    });
  };

  const setStage3Enabled = (enabled: boolean) => {
    setDraftDef((prev) => {
      if (enabled) {
        const base: ReportDefinitionV3 = {
          ...DEFAULT_DEF_V3,
          table: prev.table,
          selectColumns: prev.selectColumns ?? [],
        };
        return base;
      }
      return {
        ...prev,
        version: 1,
        searchTerm: prev.version === 1 || prev.version === 2 ? prev.searchTerm : '',
        limit: prev.version === 1 || prev.version === 2 ? prev.limit : 500,
        aggregation: prev.version === 1 || prev.version === 2 ? prev.aggregation : { enabled: false },
      } as AnyReportDefinition;
    });
  };

  const updateFilter = (idx: number, patch: Partial<ReportFilter>) => {
    setDraftDef((prev) => {
      if (prev.version !== 3) return prev;
      const next = [...(prev.filters ?? [])];
      next[idx] = { ...(next[idx] ?? { field: allColumns[0] ?? '', op: 'eq' }), ...patch };
      return { ...prev, filters: next };
    });
  };

  const addFilter = () => {
    setDraftDef((prev) => {
      if (prev.version !== 3) return prev;
      const next = [...(prev.filters ?? [])];
      next.push({ field: allColumns[0] ?? '', op: 'eq', value: '' });
      return { ...prev, filters: next };
    });
  };

  const removeFilter = (idx: number) => {
    setDraftDef((prev) => {
      if (prev.version !== 3) return prev;
      const next = [...(prev.filters ?? [])];
      next.splice(idx, 1);
      return { ...prev, filters: next };
    });
  };

  const updateMeasure = (idx: number, patch: Partial<ReportAggregationMeasure>) => {
    setDraftDef((prev) => {
      if (prev.version !== 3) return prev;
      const next = [...(prev.measures ?? [])];
      next[idx] = { ...(next[idx] ?? { op: 'count' }), ...patch };
      return { ...prev, measures: next };
    });
  };

  const addMeasure = () => {
    setDraftDef((prev) => {
      if (prev.version !== 3) return prev;
      const next = [...(prev.measures ?? [])];
      next.push({ op: 'count', as: `count_${next.length + 1}` });
      return { ...prev, measures: next };
    });
  };

  const removeMeasure = (idx: number) => {
    setDraftDef((prev) => {
      if (prev.version !== 3) return prev;
      const next = [...(prev.measures ?? [])];
      next.splice(idx, 1);
      return { ...prev, measures: next };
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-primary-dark animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Auswertungen</h1>
            <p className="text-xs sm:text-sm text-gray-500">Reports speichern, ausführen und als CSV exportieren.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={createNewReport}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary-dark"
            >
              <Plus className="w-4 h-4" />
              Neu
            </button>
            <button
              type="button"
              onClick={loadInitial}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              title="Aktualisieren"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <aside className="lg:col-span-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900">Gespeicherte Reports</div>
          </div>
          <div className="max-h-[60vh] overflow-auto">
            {reports.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">Noch keine Reports vorhanden.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {reports.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedReportId(r.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${
                      selectedReportId === r.id ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900">{r.name}</div>
                    <div className="text-xs text-gray-500">{new Date(r.updatedAt).toLocaleString('de-DE')}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className="lg:col-span-2 space-y-4">
          {error && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
          )}

          {!selectedReport ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-500">
              Wähle links einen Report aus oder erstelle einen neuen.
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-600">Name</label>
                    <input
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-600">Beschreibung</label>
                    <input
                      value={draftDescription}
                      onChange={(e) => setDraftDescription(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600">Tabelle</label>
                    <select
                      value={draftDef.table}
                      onChange={(e) => setDraftDef((prev) => ({ ...prev, table: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                    >
                      {tables.map((t) => (
                        <option key={t.name} value={t.name}>
                          {t.displayName} ({t.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600">Limit</label>
                    <input
                      type="number"
                      value={(draftDef as any).limit ?? 500}
                      min={1}
                      max={5000}
                      onChange={(e) => setDraftDef((prev) => ({ ...prev, limit: Number(e.target.value) }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600">Suche</label>
                    <input
                      value={draftDef.version === 1 || draftDef.version === 2 ? draftDef.searchTerm ?? '' : ''}
                      onChange={(e) =>
                        setDraftDef((prev) => (prev.version === 1 || prev.version === 2 ? { ...prev, searchTerm: e.target.value } : prev))
                      }
                      className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      disabled={draftDef.version === 3}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draftDef.version === 3}
                      onChange={(e) => setStage3Enabled(e.target.checked)}
                    />
                    Stufe 3 (Filter/GroupBy)
                  </label>
                  <div className="sm:col-span-2 text-xs text-gray-500 flex items-center">
                    Serverseitige Filter, Sortierung, Pagination und Aggregationen.
                  </div>
                </div>

                {draftDef.version === 3 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600">Offset</label>
                        <input
                          type="number"
                          min={0}
                          value={draftDef.offset ?? 0}
                          onChange={(e) => setDraftDef((prev) => (prev.version === 3 ? { ...prev, offset: Number(e.target.value) } : prev))}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600">Limit</label>
                        <input
                          type="number"
                          min={1}
                          max={5000}
                          value={draftDef.limit ?? 200}
                          onChange={(e) => setDraftDef((prev) => (prev.version === 3 ? { ...prev, limit: Number(e.target.value) } : prev))}
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600">Sort</label>
                        <div className="mt-1 flex gap-2">
                          <select
                            value={draftDef.sort?.field ?? ''}
                            onChange={(e) =>
                              setDraftDef((prev) =>
                                prev.version === 3
                                  ? { ...prev, sort: e.target.value ? { field: e.target.value, dir: prev.sort?.dir ?? 'asc' } : undefined }
                                  : prev
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                          >
                            <option value="">(kein)</option>
                            {allColumns.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          <select
                            value={draftDef.sort?.dir ?? 'asc'}
                            onChange={(e) =>
                              setDraftDef((prev) =>
                                prev.version === 3 && prev.sort
                                  ? { ...prev, sort: { ...prev.sort, dir: e.target.value as any } }
                                  : prev
                              )
                            }
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                            disabled={!draftDef.sort}
                          >
                            <option value="asc">asc</option>
                            <option value="desc">desc</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-gray-900">Filter</div>
                        <button
                          type="button"
                          onClick={addFilter}
                          className="px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs hover:bg-gray-50"
                        >
                          + Filter
                        </button>
                      </div>

                      {(draftDef.filters ?? []).length === 0 ? (
                        <div className="mt-2 text-xs text-gray-500">Keine Filter.</div>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {(draftDef.filters ?? []).map((f, idx) => (
                            <div key={idx} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                              <select
                                value={f.field}
                                onChange={(e) => updateFilter(idx, { field: e.target.value })}
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                              >
                                {allColumns.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={f.op}
                                onChange={(e) => updateFilter(idx, { op: e.target.value as any })}
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                              >
                                <option value="eq">eq</option>
                                <option value="contains">contains</option>
                                <option value="gt">gt</option>
                                <option value="gte">gte</option>
                                <option value="lt">lt</option>
                                <option value="lte">lte</option>
                                <option value="between">between</option>
                                <option value="isNull">isNull</option>
                                <option value="notNull">notNull</option>
                              </select>
                              <input
                                value={(f.value ?? '') as any}
                                onChange={(e) => updateFilter(idx, { value: e.target.value })}
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                disabled={f.op === 'isNull' || f.op === 'notNull'}
                                placeholder="value"
                              />
                              <input
                                value={(f.value2 ?? '') as any}
                                onChange={(e) => updateFilter(idx, { value2: e.target.value })}
                                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                disabled={f.op !== 'between'}
                                placeholder="value2"
                              />
                              <button
                                type="button"
                                onClick={() => removeFilter(idx)}
                                className="px-3 py-2 rounded-lg border border-red-200 bg-white text-red-600 text-sm hover:bg-red-50"
                              >
                                Entfernen
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-gray-100 pt-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-gray-900">Aggregation</div>
                        <button
                          type="button"
                          onClick={addMeasure}
                          className="px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs hover:bg-gray-50"
                        >
                          + Measure
                        </button>
                      </div>

                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600">Group by</label>
                          <select
                            value={draftDef.groupBy ?? ''}
                            onChange={(e) =>
                              setDraftDef((prev) => (prev.version === 3 ? { ...prev, groupBy: e.target.value } : prev))
                            }
                            className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                          >
                            <option value="">(kein)</option>
                            {allColumns.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="mt-2 space-y-2">
                        {(draftDef.measures ?? []).map((m, idx) => (
                          <div key={idx} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                            <select
                              value={m.op}
                              onChange={(e) => updateMeasure(idx, { op: e.target.value as any })}
                              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                            >
                              <option value="count">count</option>
                              <option value="sum">sum</option>
                              <option value="avg">avg</option>
                              <option value="min">min</option>
                              <option value="max">max</option>
                            </select>
                            <select
                              value={m.field ?? ''}
                              onChange={(e) => updateMeasure(idx, { field: e.target.value || undefined })}
                              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                              disabled={m.op === 'count'}
                            >
                              <option value="">(feld)</option>
                              {allColumns.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                            <input
                              value={m.as ?? ''}
                              onChange={(e) => updateMeasure(idx, { as: e.target.value })}
                              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                              placeholder="Alias"
                            />
                            <div className="sm:col-span-2" />
                            <button
                              type="button"
                              onClick={() => removeMeasure(idx)}
                              className="px-3 py-2 rounded-lg border border-red-200 bg-white text-red-600 text-sm hover:bg-red-50"
                            >
                              Entfernen
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draftDef.version !== 3 && !!(draftDef as any).aggregation && (draftDef as any).aggregation.enabled}
                      onChange={(e) =>
                        setDraftDef((prev) => ({
                          ...prev,
                          aggregation: e.target.checked
                            ? { enabled: true, groupBy: allColumns[0] ?? '', op: 'count' }
                            : { enabled: false },
                        }))
                      }
                      disabled={draftDef.version === 3}
                    />
                    Aggregation
                  </label>

                  {draftDef.version !== 3 && (draftDef as any).aggregation && (draftDef as any).aggregation.enabled ? (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600">Group by</label>
                        <select
                          value={(draftDef as any).aggregation.groupBy}
                          onChange={(e) =>
                            setDraftDef((prev) => ({
                              ...prev,
                              aggregation:
                                (prev as any).aggregation && (prev as any).aggregation.enabled
                                  ? { ...(prev as any).aggregation, groupBy: e.target.value }
                                  : (prev as any).aggregation,
                            }))
                          }
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                        >
                          {allColumns.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600">Operation</label>
                        <select
                          value={(draftDef as any).aggregation.op}
                          onChange={(e) =>
                            setDraftDef((prev) => ({
                              ...prev,
                              aggregation:
                                (prev as any).aggregation && (prev as any).aggregation.enabled
                                  ? { ...(prev as any).aggregation, op: e.target.value as any }
                                  : (prev as any).aggregation,
                            }))
                          }
                          className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                        >
                          <option value="count">count</option>
                          <option value="sum">sum</option>
                          <option value="avg">avg</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <div className="sm:col-span-2 text-xs text-gray-500 flex items-center">Optional: Gruppieren + zählen/summieren.</div>
                  )}
                </div>

                {draftDef.version !== 3 &&
                  (draftDef as any).aggregation &&
                  (draftDef as any).aggregation.enabled &&
                  (((draftDef as any).aggregation.op === 'sum' || (draftDef as any).aggregation.op === 'avg') ? (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600">Feld (für sum/avg)</label>
                      <select
                        value={(draftDef as any).aggregation.field ?? ''}
                        onChange={(e) =>
                          setDraftDef((prev) => ({
                            ...prev,
                            aggregation:
                              (prev as any).aggregation && (prev as any).aggregation.enabled
                                ? { ...(prev as any).aggregation, field: e.target.value }
                                : (prev as any).aggregation,
                          }))
                        }
                        className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                      >
                        <option value="">(wählen)</option>
                        {selectedColumns.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null)}

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={saveReport}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary-dark"
                  >
                    <Save className="w-4 h-4" />
                    Speichern
                  </button>
                  <button
                    type="button"
                    onClick={runReport}
                    disabled={runLoading}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    {runLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Ausführen
                  </button>
                  <a
                    href={`/api/reports/${selectedReportId}/export`}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm hover:bg-gray-50"
                  >
                    <Download className="w-4 h-4" />
                    CSV
                  </a>
                  <button
                    type="button"
                    onClick={deleteReport}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-white text-red-600 text-sm hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Löschen
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="text-sm font-semibold text-gray-900 mb-2">Spalten</div>
                {schema ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {allColumns.map((name) => (
                      <label key={name} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedColumns.includes(name)}
                          onChange={() => toggleColumn(name)}
                        />
                        <span className="truncate" title={name}>
                          {name}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Schema konnte nicht geladen werden.</div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">Ergebnis</div>
                  {runResult && (
                    <div className="text-xs text-gray-500">{runResult.rows.length} Zeilen</div>
                  )}
                </div>

                {!runResult ? (
                  <div className="p-4 text-sm text-gray-500">Noch nicht ausgeführt.</div>
                ) : runResult.rows.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">Keine Daten.</div>
                ) : (
                  <div className="overflow-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {runResult.columns.map((c) => (
                            <th key={c} className="px-4 py-3 whitespace-nowrap">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {runResult.rows.slice(0, 500).map((row, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            {runResult.columns.map((c) => (
                              <td key={c} className="px-4 py-3 whitespace-nowrap text-gray-700">
                                {row[c] === null || row[c] === undefined ? '—' : String(row[c])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {runResult.rows.length > 500 && (
                      <div className="px-4 py-3 text-xs text-gray-500 border-t border-gray-100">
                        Anzeige gekürzt auf 500 Zeilen.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
