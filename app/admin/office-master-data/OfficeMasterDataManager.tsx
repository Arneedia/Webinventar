'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, Package, Plus, Search, Edit2, Trash2, X } from 'lucide-react';

interface Manufacturer {
  HSID: number;
  HSName: string | null;
}

interface Model {
  ModID: number;
  ModName: string | null;
  ModellNummer: string | null;
}

type TabKey = 'manufacturers' | 'models';

const tabs: { key: TabKey; label: string; icon: any }[] = [
  { key: 'manufacturers', label: 'Hersteller', icon: Building2 },
  { key: 'models', label: 'Modelle', icon: Package },
];

export default function OfficeMasterDataManager() {
  const [activeTab, setActiveTab] = useState<TabKey>('manufacturers');
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<number | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Manufacturer Form
  const [manufacturerForm, setManufacturerForm] = useState({
    HSName: '',
  });

  // Model Form
  const [modelForm, setModelForm] = useState({
    ModName: '',
    ModellNummer: '',
  });

  const fetchManufacturers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tables/HS', { cache: 'no-store' });
      if (!res.ok) throw new Error('Fehler beim Laden');
      const data = await res.json();
      setManufacturers(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tables/MOD', { cache: 'no-store' });
      if (!res.ok) throw new Error('Fehler beim Laden');
      const data = await res.json();
      setModels(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'manufacturers') {
      fetchManufacturers();
    } else {
      fetchModels();
    }
  }, [activeTab, fetchManufacturers, fetchModels]);

  const resetFeedback = () => {
    setError(null);
    setSuccess(null);
  };

  const handleCreateManufacturer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manufacturerForm.HSName.trim()) {
      setError('Bitte einen Herstellernamen eingeben');
      return;
    }

    resetFeedback();
    setSubmitting(true);

    try {
      const res = await fetch('/api/tables/HS', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ HSName: manufacturerForm.HSName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Erstellen');
      }

      setSuccess('Hersteller erfolgreich erstellt');
      setManufacturerForm({ HSName: '' });
      setShowCreateModal(false);
      fetchManufacturers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateManufacturer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedManufacturerId || !manufacturerForm.HSName.trim()) {
      setError('Bitte einen Herstellernamen eingeben');
      return;
    }

    resetFeedback();
    setSubmitting(true);

    try {
      const res = await fetch(`/api/tables/HS/${selectedManufacturerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ HSName: manufacturerForm.HSName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Aktualisieren');
      }

      setSuccess('Hersteller erfolgreich aktualisiert');
      fetchManufacturers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Aktualisieren');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteManufacturer = async (id: number) => {
    if (!confirm('Hersteller wirklich löschen?')) return;

    resetFeedback();

    try {
      const res = await fetch(`/api/tables/HS/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Löschen');
      }

      setSuccess('Hersteller erfolgreich gelöscht');
      setSelectedManufacturerId(null);
      fetchManufacturers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  };

  const handleCreateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelForm.ModName.trim()) {
      setError('Bitte einen Modellnamen eingeben');
      return;
    }

    resetFeedback();
    setSubmitting(true);

    try {
      const res = await fetch('/api/tables/MOD', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ModName: modelForm.ModName.trim(),
          ModellNummer: modelForm.ModellNummer.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Erstellen');
      }

      setSuccess('Modell erfolgreich erstellt');
      setModelForm({ ModName: '', ModellNummer: '' });
      setShowCreateModal(false);
      fetchModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModelId || !modelForm.ModName.trim()) {
      setError('Bitte einen Modellnamen eingeben');
      return;
    }

    resetFeedback();
    setSubmitting(true);

    try {
      const res = await fetch(`/api/tables/MOD/${selectedModelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ModName: modelForm.ModName.trim(),
          ModellNummer: modelForm.ModellNummer.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Aktualisieren');
      }

      setSuccess('Modell erfolgreich aktualisiert');
      fetchModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Aktualisieren');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteModel = async (id: number) => {
    if (!confirm('Modell wirklich löschen?')) return;

    resetFeedback();

    try {
      const res = await fetch(`/api/tables/MOD/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Löschen');
      }

      setSuccess('Modell erfolgreich gelöscht');
      setSelectedModelId(null);
      fetchModels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  };

  const filteredManufacturers = manufacturers.filter((m) =>
    m.HSName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredModels = models.filter(
    (m) =>
      m.ModName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.ModellNummer?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedManufacturer = manufacturers.find((m) => m.HSID === selectedManufacturerId);
  const selectedModel = models.find((m) => m.ModID === selectedModelId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Büroinventar Stammdaten</h1>
          <p className="text-gray-600 mt-1">Verwaltung von Herstellern und Modellen</p>
        </div>
        <button
          onClick={() => {
            setShowCreateModal(true);
            resetFeedback();
            if (activeTab === 'manufacturers') {
              setManufacturerForm({ HSName: '' });
            } else {
              setModelForm({ ModName: '', ModellNummer: '' });
            }
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 shadow-lg transition-all"
        >
          <Plus className="h-5 w-5" />
          {activeTab === 'manufacturers' ? 'Neuer Hersteller' : 'Neues Modell'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSearchTerm('');
                  setSelectedManufacturerId(null);
                  setSelectedModelId(null);
                  resetFeedback();
                }}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === tab.key
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Feedback Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
          {success}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Laden...</div>
            ) : activeTab === 'manufacturers' ? (
              <div className="divide-y divide-gray-200">
                {filteredManufacturers.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">Keine Hersteller gefunden</div>
                ) : (
                  filteredManufacturers.map((manufacturer) => (
                    <div
                      key={manufacturer.HSID}
                      onClick={() => {
                        setSelectedManufacturerId(manufacturer.HSID);
                        setManufacturerForm({ HSName: manufacturer.HSName || '' });
                        resetFeedback();
                      }}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedManufacturerId === manufacturer.HSID
                          ? 'bg-purple-50 border-l-4 border-purple-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            {manufacturer.HSName || `Hersteller ${manufacturer.HSID}`}
                          </div>
                          <div className="text-sm text-gray-500">ID: {manufacturer.HSID}</div>
                        </div>
                        <Building2 className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredModels.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">Keine Modelle gefunden</div>
                ) : (
                  filteredModels.map((model) => (
                    <div
                      key={model.ModID}
                      onClick={() => {
                        setSelectedModelId(model.ModID);
                        setModelForm({
                          ModName: model.ModName || '',
                          ModellNummer: model.ModellNummer || '',
                        });
                        resetFeedback();
                      }}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedModelId === model.ModID
                          ? 'bg-purple-50 border-l-4 border-purple-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            {model.ModName || `Modell ${model.ModID}`}
                          </div>
                          {model.ModellNummer && (
                            <div className="text-sm text-gray-500">Nr: {model.ModellNummer}</div>
                          )}
                          <div className="text-sm text-gray-500">ID: {model.ModID}</div>
                        </div>
                        <Package className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          {activeTab === 'manufacturers' && selectedManufacturer ? (
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Hersteller bearbeiten</h2>
                <button
                  onClick={() => {
                    setSelectedManufacturerId(null);
                    setManufacturerForm({ HSName: '' });
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateManufacturer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={manufacturerForm.HSName}
                    onChange={(e) => setManufacturerForm({ HSName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'Speichern...' : 'Speichern'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteManufacturer(selectedManufacturer.HSID)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </form>
            </div>
          ) : activeTab === 'models' && selectedModel ? (
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Modell bearbeiten</h2>
                <button
                  onClick={() => {
                    setSelectedModelId(null);
                    setModelForm({ ModName: '', ModellNummer: '' });
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateModel} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={modelForm.ModName}
                    onChange={(e) => setModelForm((prev) => ({ ...prev, ModName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modellnummer
                  </label>
                  <input
                    type="text"
                    value={modelForm.ModellNummer}
                    onChange={(e) =>
                      setModelForm((prev) => ({ ...prev, ModellNummer: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'Speichern...' : 'Speichern'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteModel(selectedModel.ModID)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
              Wähle einen Eintrag aus, um Details anzuzeigen
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {activeTab === 'manufacturers' ? 'Neuer Hersteller' : 'Neues Modell'}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {activeTab === 'manufacturers' ? (
              <form onSubmit={handleCreateManufacturer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={manufacturerForm.HSName}
                    onChange={(e) => setManufacturerForm({ HSName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'Erstellen...' : 'Erstellen'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateModel} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={modelForm.ModName}
                    onChange={(e) => setModelForm((prev) => ({ ...prev, ModName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modellnummer
                  </label>
                  <input
                    type="text"
                    value={modelForm.ModellNummer}
                    onChange={(e) =>
                      setModelForm((prev) => ({ ...prev, ModellNummer: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'Erstellen...' : 'Erstellen'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
