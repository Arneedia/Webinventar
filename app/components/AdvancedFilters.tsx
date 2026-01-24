'use client';

import { useState } from 'react';
import { Filter, X, Save, Trash2 } from 'lucide-react';

interface FilterConfig {
  name: string;
  hwFilter: string;
  hsFilter: string;
  modFilter: string;
  deviceSearch: string;
  filterUserId: string;
  statusFilter: 'all' | 'active' | 'retired';
  showUnassignedOnly: boolean;
  priceMin: string;
  priceMax: string;
  dateFrom: string;
  dateTo: string;
}

interface AdvancedFiltersProps {
  hwFilter: string;
  setHwFilter: (value: string) => void;
  hsFilter: string;
  setHsFilter: (value: string) => void;
  modFilter: string;
  setModFilter: (value: string) => void;
  deviceSearch: string;
  setDeviceSearch: (value: string) => void;
  filterUserId: string;
  setFilterUserId: (value: string) => void;
  statusFilter: 'all' | 'active' | 'retired';
  setStatusFilter: (value: 'all' | 'active' | 'retired') => void;
  showUnassignedOnly: boolean;
  setShowUnassignedOnly: (value: boolean) => void;
  users: { id: number; name: string }[];
  hwOptions: { id: number; name: string }[];
  hsOptions: { id: number; name: string }[];
  modOptions: { id: number; name: string }[];
}

export default function AdvancedFilters({
  hwFilter,
  setHwFilter,
  hsFilter,
  setHsFilter,
  modFilter,
  setModFilter,
  deviceSearch,
  setDeviceSearch,
  filterUserId,
  setFilterUserId,
  statusFilter,
  setStatusFilter,
  showUnassignedOnly,
  setShowUnassignedOnly,
  users,
  hwOptions,
  hsOptions,
  modOptions,
}: AdvancedFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [savedFilters, setSavedFilters] = useState<FilterConfig[]>([]);
  const [filterName, setFilterName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const handleReset = () => {
    setHwFilter('');
    setHsFilter('');
    setModFilter('');
    setDeviceSearch('');
    setFilterUserId('');
    setStatusFilter('all');
    setShowUnassignedOnly(false);
    setPriceMin('');
    setPriceMax('');
    setDateFrom('');
    setDateTo('');
  };

  const handleSaveFilter = () => {
    if (!filterName.trim()) return;
    
    const newFilter: FilterConfig = {
      name: filterName,
      hwFilter,
      hsFilter,
      modFilter,
      deviceSearch,
      filterUserId,
      statusFilter,
      showUnassignedOnly,
      priceMin,
      priceMax,
      dateFrom,
      dateTo,
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem('deviceFilters', JSON.stringify(updated));
    setFilterName('');
    setShowSaveDialog(false);
  };

  const handleLoadFilter = (filter: FilterConfig) => {
    setHwFilter(filter.hwFilter);
    setHsFilter(filter.hsFilter);
    setModFilter(filter.modFilter);
    setDeviceSearch(filter.deviceSearch);
    setFilterUserId(filter.filterUserId);
    setStatusFilter(filter.statusFilter);
    setShowUnassignedOnly(filter.showUnassignedOnly);
    setPriceMin(filter.priceMin);
    setPriceMax(filter.priceMax);
    setDateFrom(filter.dateFrom);
    setDateTo(filter.dateTo);
  };

  const handleDeleteFilter = (index: number) => {
    const updated = savedFilters.filter((_, i) => i !== index);
    setSavedFilters(updated);
    localStorage.setItem('deviceFilters', JSON.stringify(updated));
  };

  const activeFilterCount = [
    hwFilter,
    hsFilter,
    modFilter,
    deviceSearch,
    filterUserId,
    statusFilter !== 'all',
    showUnassignedOnly,
    priceMin,
    priceMax,
    dateFrom,
    dateTo,
  ].filter(Boolean).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary-dark" />
          <h3 className="text-sm font-semibold text-gray-900">Filter</h3>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary-dark text-xs font-medium">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-primary-dark hover:underline"
          >
            {showAdvanced ? 'Weniger' : 'Erweitert'}
          </button>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-600 hover:bg-gray-100"
            >
              <X className="w-3 h-3" />
              Zurücksetzen
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Suche</label>
          <input
            type="text"
            placeholder="Inventarcode, SNO, IMEI..."
            value={deviceSearch}
            onChange={(e) => setDeviceSearch(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Benutzer</label>
          <select
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Alle Benutzer</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'retired')}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">Alle</option>
            <option value="active">Aktiv</option>
            <option value="retired">Ausgebucht</option>
          </select>
        </div>

        {showAdvanced && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Hardware-Typ</label>
              <select
                value={hwFilter}
                onChange={(e) => setHwFilter(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Alle Typen</option>
                {hwOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Hersteller</label>
              <select
                value={hsFilter}
                onChange={(e) => setHsFilter(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Alle Hersteller</option>
                {hsOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Modell</label>
              <select
                value={modFilter}
                onChange={(e) => setModFilter(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Alle Modelle</option>
                {modOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Preis von</label>
              <input
                type="number"
                placeholder="Min. Preis"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Preis bis</label>
              <input
                type="number"
                placeholder="Max. Preis"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Zugang ab</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Zugang bis</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </>
        )}

        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showUnassignedOnly}
              onChange={(e) => setShowUnassignedOnly(e.target.checked)}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
            />
            <span className="text-xs text-gray-700">Nur nicht zugewiesen</span>
          </label>
        </div>
      </div>

      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-700">Gespeicherte Filter</h4>
            <button
              type="button"
              onClick={() => setShowSaveDialog(!showSaveDialog)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-primary-dark hover:bg-primary/10"
            >
              <Save className="w-3 h-3" />
              Speichern
            </button>
          </div>

          {showSaveDialog && (
            <div className="mb-3 flex gap-2">
              <input
                type="text"
                placeholder="Filtername..."
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="button"
                onClick={handleSaveFilter}
                className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs hover:bg-primary-dark"
              >
                Speichern
              </button>
              <button
                type="button"
                onClick={() => setShowSaveDialog(false)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50"
              >
                Abbrechen
              </button>
            </div>
          )}

          {savedFilters.length > 0 ? (
            <div className="space-y-2">
              {savedFilters.map((filter, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  <button
                    type="button"
                    onClick={() => handleLoadFilter(filter)}
                    className="flex-1 text-left text-xs text-gray-700 hover:text-primary-dark"
                  >
                    {filter.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteFilter(index)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">Keine gespeicherten Filter</p>
          )}
        </div>
      )}
    </div>
  );
}
