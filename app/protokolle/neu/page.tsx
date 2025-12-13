'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardList,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  Repeat,
  User,
  Check,
  MonitorSmartphone,
  Package,
  Loader2,
  AlertCircle,
  Search,
} from 'lucide-react';

interface BenutzerOption {
  id: number;
  name: string;
  abteilung: string | null;
  geschaeftsstelle: string | null;
  raum: string | null;
}

interface DeviceOption {
  id: number;
  inventarCode: string;
  sno: string;
  hwName: string | null;
  hsName: string | null;
  modName: string | null;
  isAssigned: boolean;
}

interface ZubehoerOption {
  id: number;
  typ: string | null;
  hersteller: string | null;
  modell: string | null;
  beschreibung: string | null;
}

interface SelectedPosition {
  type: 'geraet' | 'zubehoer';
  id: number;
  label: string;
  zustand: string;
  zustandNotiz: string;
  vollstaendig: boolean;
  fehlendTeile: string;
}

type ProtocolTyp = 'AUSGABE' | 'RUECKGABE' | 'TAUSCH';

export default function NeuesProtokollPage() {
  const router = useRouter();

  // Wizard-Schritt
  const [step, setStep] = useState(1);

  // Schritt 1: Typ & Benutzer
  const [typ, setTyp] = useState<ProtocolTyp | ''>('');
  const [benutzerId, setBenutzerId] = useState<number | null>(null);
  const [benutzerSearch, setBenutzerSearch] = useState('');
  const [benutzerOptions, setBenutzerOptions] = useState<BenutzerOption[]>([]);
  const [loadingBenutzer, setLoadingBenutzer] = useState(true);

  // Schritt 2: Positionen
  const [deviceOptions, setDeviceOptions] = useState<DeviceOption[]>([]);
  const [zubehoerOptions, setZubehoerOptions] = useState<ZubehoerOption[]>([]);
  const [deviceAccessories, setDeviceAccessories] = useState<ZubehoerOption[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [loadingZubehoer, setLoadingZubehoer] = useState(false);
  const [selectedPositions, setSelectedPositions] = useState<SelectedPosition[]>([]);
  const [deviceSearch, setDeviceSearch] = useState('');
  const [selectedDeviceForAccessories, setSelectedDeviceForAccessories] = useState<number | null>(null);

  // Schritt 3: Bemerkungen & Abschluss
  const [bemerkung, setBemerkung] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBenutzer();
  }, []);

  useEffect(() => {
    if (benutzerId && typ) {
      fetchDevices();
      fetchAvailableAccessories();
    }
  }, [benutzerId, typ]);

  const fetchBenutzer = async () => {
    try {
      setLoadingBenutzer(true);
      const res = await fetch('/api/tables/Benutzer');
      if (!res.ok) throw new Error('Fehler beim Laden');
      const json = await res.json();
      const options: BenutzerOption[] = (json.data as any[]).map((row) => ({
        id: row.BenutzerID,
        name: row.BenutzerName || `Benutzer ${row.BenutzerID}`,
        abteilung: row.ABTID_Display || null,
        geschaeftsstelle: row.GSID_Display || null,
        raum: row.BenutzerRaum || null,
      }));
      setBenutzerOptions(options);
    } catch {
      setBenutzerOptions([]);
    } finally {
      setLoadingBenutzer(false);
    }
  };

  const fetchDevices = async () => {
    try {
      setLoadingDevices(true);
      const res = await fetch('/api/devices');
      if (!res.ok) throw new Error('Fehler beim Laden');
      const data = await res.json();
      const options: DeviceOption[] = data
        .filter((d: any) => !d.currentUserId) // nur unzugewiesene Geräte anzeigen
        .map((d: any) => ({
          id: d.id,
          inventarCode: d.inventarCode,
          sno: d.sno,
          hwName: d.hwName,
          hsName: d.hsName,
          modName: d.modelName,
          isAssigned: d.currentUserId === benutzerId,
        }));
      setDeviceOptions(options);
    } catch {
      setDeviceOptions([]);
    } finally {
      setLoadingDevices(false);
    }
  };

  const fetchAvailableAccessories = async () => {
    try {
      setLoadingZubehoer(true);
      const res = await fetch('/api/accessories/available');
      if (!res.ok) throw new Error('Fehler beim Laden');
      const json = await res.json();
      const options: ZubehoerOption[] = (json as any[]).map((row) => ({
        id: row.id,
        typ: row.typ,
        hersteller: row.hersteller,
        modell: row.modell,
        beschreibung: row.beschreibung,
      }));
      setZubehoerOptions(options);
    } catch {
      setZubehoerOptions([]);
    } finally {
      setLoadingZubehoer(false);
    }
  };

  const fetchAccessoriesForDevice = async (deviceId: number) => {
    try {
      setLoadingZubehoer(true);
      const res = await fetch(`/api/devices/${deviceId}/accessories`);
      if (!res.ok) throw new Error('Fehler beim Laden');
      const json = await res.json();
      const activeAccessories: ZubehoerOption[] = (json.accessories as any[])
        .filter((a: any) => a.status === 'ACTIVE')
        .map((a: any) => ({
          id: a.accessoryId,
          typ: a.accessoryType,
          hersteller: null,
          modell: null,
          beschreibung: a.accessoryLabel,
        }));
      setDeviceAccessories(activeAccessories);

      // Vorauswahl dieser Zubehörteile (Zustand standard GUT)
      setSelectedPositions((prev) => {
        // Entferne alte auto-Selections für Zubehör, um Doppelungen zu vermeiden
        const withoutOldAuto = prev.filter((p) => !(p.type === 'zubehoer' && p.label.startsWith('[auto]')));
        const autoSelections = activeAccessories.map((z) => ({
          type: 'zubehoer' as const,
          id: z.id,
          label: `[auto] ${[z.typ, z.beschreibung].filter(Boolean).join(' ') || `Zubehör #${z.id}`}`,
          zustand: 'GUT',
          zustandNotiz: '',
          vollstaendig: true,
          fehlendTeile: '',
        }));
        // Wenn Zubehör bereits manuell ausgewählt ist, nicht duplizieren
        const existingIds = new Set(withoutOldAuto.filter((p) => p.type === 'zubehoer').map((p) => p.id));
        const merged = [...withoutOldAuto];
        for (const a of autoSelections) {
          if (!existingIds.has(a.id)) merged.push(a);
        }
        return merged;
      });
    } catch {
      setDeviceAccessories([]);
    } finally {
      setLoadingZubehoer(false);
    }
  };

  const selectedBenutzer = benutzerOptions.find((b) => b.id === benutzerId);

  const filteredBenutzer = benutzerOptions.filter((b) => {
    if (!benutzerSearch) return true;
    const term = benutzerSearch.toLowerCase();
    return (
      b.name.toLowerCase().includes(term) ||
      b.abteilung?.toLowerCase().includes(term) ||
      b.geschaeftsstelle?.toLowerCase().includes(term)
    );
  });

  const filteredDevices = deviceOptions.filter((d) => {
    if (!deviceSearch) return true;
    const term = deviceSearch.toLowerCase();
    return (
      d.inventarCode.toLowerCase().includes(term) ||
      d.sno.toLowerCase().includes(term) ||
      d.hwName?.toLowerCase().includes(term) ||
      d.hsName?.toLowerCase().includes(term) ||
      d.modName?.toLowerCase().includes(term)
    );
  });

  // Bei Rückgabe: Nur dem Benutzer zugewiesene Geräte zeigen
  const relevantDevices =
    typ === 'RUECKGABE' ? filteredDevices.filter((d) => d.isAssigned) : filteredDevices;

  const toggleDevice = (device: DeviceOption) => {
    const existing = selectedPositions.find((p) => p.type === 'geraet' && p.id === device.id);
    if (existing) {
      setSelectedPositions((prev) => prev.filter((p) => !(p.type === 'geraet' && p.id === device.id)));
      setSelectedDeviceForAccessories(null);
      setDeviceAccessories([]);
    } else {
      setSelectedPositions((prev) => [
        ...prev,
        {
          type: 'geraet',
          id: device.id,
          label: `${device.inventarCode} - ${device.hwName || ''} ${device.hsName || ''} ${device.modName || ''}`.trim(),
          zustand: 'GUT',
          zustandNotiz: '',
          vollstaendig: true,
          fehlendTeile: '',
        },
      ]);
      setSelectedDeviceForAccessories(device.id);
      fetchAccessoriesForDevice(device.id);
    }
  };

  const toggleZubehoer = (zub: ZubehoerOption) => {
    const existing = selectedPositions.find((p) => p.type === 'zubehoer' && p.id === zub.id);
    if (existing) {
      setSelectedPositions((prev) => prev.filter((p) => !(p.type === 'zubehoer' && p.id === zub.id)));
    } else {
      setSelectedPositions((prev) => [
        ...prev,
        {
          type: 'zubehoer',
          id: zub.id,
          label: [zub.typ, zub.hersteller, zub.modell, zub.beschreibung].filter(Boolean).join(' '),
          zustand: 'GUT',
          zustandNotiz: '',
          vollstaendig: true,
          fehlendTeile: '',
        },
      ]);
    }
  };

  const updatePosition = (index: number, field: keyof SelectedPosition, value: any) => {
    setSelectedPositions((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const canProceedStep1 = typ && benutzerId;
  const canProceedStep2 = selectedPositions.length > 0;

  const handleSubmit = async () => {
    if (!typ || !benutzerId || selectedPositions.length === 0) return;

    setSaving(true);
    setError(null);

    try {
      const payload = {
        typ,
        benutzerId,
        bemerkung: bemerkung || null,
        positionen: selectedPositions.map((pos) => ({
          gerID: pos.type === 'geraet' ? pos.id : null,
          zubehoerID: pos.type === 'zubehoer' ? pos.id : null,
          zustand: pos.zustand,
          zustandNotiz: pos.zustandNotiz || null,
          vollstaendig: pos.vollstaendig,
          fehlendTeile: pos.fehlendTeile || null,
        })),
      };

      const res = await fetch('/api/protocols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Erstellen');
      }

      const result = await res.json();
      router.push(`/protokolle/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/protokolle')}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">Neues Übergabeprotokoll</h1>
              <p className="text-xs text-gray-500">Schritt {step} von 3</p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mx-auto max-w-3xl px-4 pb-4">
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1 rounded-full ${
                  s <= step ? 'bg-primary' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {/* Schritt 1: Typ & Benutzer */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Was möchten Sie dokumentieren?
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setTyp('AUSGABE')}
                    className={`p-4 border-2 rounded-xl text-left transition-colors ${
                      typ === 'AUSGABE'
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <ArrowUpRight
                      className={`w-6 h-6 mb-2 ${
                        typ === 'AUSGABE' ? 'text-emerald-600' : 'text-gray-400'
                      }`}
                    />
                    <div className="font-medium text-gray-900">Ausgabe</div>
                    <div className="text-xs text-gray-500">Geräte an Mitarbeiter übergeben</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTyp('RUECKGABE')}
                    className={`p-4 border-2 rounded-xl text-left transition-colors ${
                      typ === 'RUECKGABE'
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <ArrowDownLeft
                      className={`w-6 h-6 mb-2 ${
                        typ === 'RUECKGABE' ? 'text-amber-600' : 'text-gray-400'
                      }`}
                    />
                    <div className="font-medium text-gray-900">Rückgabe</div>
                    <div className="text-xs text-gray-500">Geräte vom Mitarbeiter zurücknehmen</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTyp('TAUSCH')}
                    className={`p-4 border-2 rounded-xl text-left transition-colors ${
                      typ === 'TAUSCH'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Repeat
                      className={`w-6 h-6 mb-2 ${
                        typ === 'TAUSCH' ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    />
                    <div className="font-medium text-gray-900">Tausch</div>
                    <div className="text-xs text-gray-500">Gerät austauschen</div>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Mitarbeiter auswählen</h2>

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Mitarbeiter suchen..."
                    value={benutzerSearch}
                    onChange={(e) => setBenutzerSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {loadingBenutzer ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {filteredBenutzer.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setBenutzerId(b.id)}
                        className={`w-full p-3 text-left flex items-center gap-3 hover:bg-gray-50 ${
                          benutzerId === b.id ? 'bg-primary/10' : ''
                        }`}
                      >
                        <div
                          className={`p-2 rounded-full ${
                            benutzerId === b.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {benutzerId === b.id ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">{b.name}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {[b.abteilung, b.geschaeftsstelle, b.raum].filter(Boolean).join(' • ')}
                          </div>
                        </div>
                      </button>
                    ))}
                    {filteredBenutzer.length === 0 && (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        Keine Mitarbeiter gefunden
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Schritt 2: Positionen */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Ausgewählte Positionen */}
              {selectedPositions.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Ausgewählte Positionen ({selectedPositions.length})
                  </h2>
                  <div className="space-y-3">
                    {selectedPositions.map((pos, index) => (
                      <div
                        key={`${pos.type}-${pos.id}`}
                        className="p-3 border border-gray-200 rounded-lg bg-gray-50"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {pos.type === 'geraet' ? (
                            <MonitorSmartphone className="w-4 h-4 text-primary" />
                          ) : (
                            <Package className="w-4 h-4 text-amber-600" />
                          )}
                          <span className="font-medium text-gray-900 text-sm">{pos.label}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-gray-500">Zustand</label>
                            <select
                              value={pos.zustand}
                              onChange={(e) => updatePosition(index, 'zustand', e.target.value)}
                              className="w-full mt-1 px-2 py-1 border border-gray-300 rounded text-xs"
                            >
                              <option value="NEU">Neu</option>
                              <option value="GUT">Gut</option>
                              <option value="GEBRAUCHSSPUREN">Gebrauchsspuren</option>
                              <option value="BESCHAEDIGT">Beschädigt</option>
                            </select>
                          </div>
                          {typ === 'RUECKGABE' && (
                            <div>
                              <label className="text-gray-500">Vollständig</label>
                              <select
                                value={pos.vollstaendig ? 'ja' : 'nein'}
                                onChange={(e) =>
                                  updatePosition(index, 'vollstaendig', e.target.value === 'ja')
                                }
                                className="w-full mt-1 px-2 py-1 border border-gray-300 rounded text-xs"
                              >
                                <option value="ja">Ja</option>
                                <option value="nein">Nein</option>
                              </select>
                            </div>
                          )}
                        </div>
                        {!pos.vollstaendig && (
                          <input
                            type="text"
                            placeholder="Was fehlt?"
                            value={pos.fehlendTeile}
                            onChange={(e) => updatePosition(index, 'fehlendTeile', e.target.value)}
                            className="w-full mt-2 px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Geräte auswählen */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MonitorSmartphone className="w-5 h-5 text-primary" />
                  Geräte auswählen
                </h2>

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Gerät suchen..."
                    value={deviceSearch}
                    onChange={(e) => setDeviceSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {loadingDevices ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {relevantDevices.slice(0, 50).map((d) => {
                      const isSelected = selectedPositions.some(
                        (p) => p.type === 'geraet' && p.id === d.id
                      );
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => toggleDevice(d)}
                          className={`w-full p-3 text-left flex items-center gap-3 hover:bg-gray-50 ${
                            isSelected ? 'bg-primary/10' : ''
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected ? 'bg-primary border-primary' : 'border-gray-300'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm">
                              {d.inventarCode}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {[d.hwName, d.hsName, d.modName].filter(Boolean).join(' ')} • {d.sno}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {relevantDevices.length === 0 && (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        {typ === 'RUECKGABE'
                          ? 'Keine Geräte diesem Mitarbeiter zugewiesen'
                          : 'Keine Geräte gefunden'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Zubehör auswählen */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-600" />
                  Zubehör auswählen (optional)
                </h2>

                {loadingZubehoer ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {zubehoerOptions.slice(0, 30).map((z) => {
                      const isSelected = selectedPositions.some(
                        (p) => p.type === 'zubehoer' && p.id === z.id
                      );
                      const label = [z.typ, z.hersteller, z.modell, z.beschreibung]
                        .filter(Boolean)
                        .join(' ');
                      return (
                        <button
                          key={z.id}
                          type="button"
                          onClick={() => toggleZubehoer(z)}
                          className={`w-full p-3 text-left flex items-center gap-3 hover:bg-gray-50 ${
                            isSelected ? 'bg-primary/10' : ''
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected ? 'bg-primary border-primary' : 'border-gray-300'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm truncate">
                              {label || `Zubehör #${z.id}`}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {zubehoerOptions.length === 0 && (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        Kein Zubehör vorhanden
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Schritt 3: Bemerkungen & Abschluss */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Zusammenfassung</h2>

                <div className="space-y-4 text-sm">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Typ</span>
                    <span className="font-medium">
                      {typ === 'AUSGABE' && 'Geräteausgabe'}
                      {typ === 'RUECKGABE' && 'Geräterückgabe'}
                      {typ === 'TAUSCH' && 'Gerätetausch'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Mitarbeiter</span>
                    <span className="font-medium">{selectedBenutzer?.name}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-600">Positionen</span>
                    <span className="font-medium">{selectedPositions.length}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="font-medium text-gray-900 mb-2">Positionen:</h3>
                  <ul className="space-y-1 text-sm text-gray-600">
                    {selectedPositions.map((pos) => (
                      <li key={`${pos.type}-${pos.id}`} className="flex items-center gap-2">
                        {pos.type === 'geraet' ? (
                          <MonitorSmartphone className="w-4 h-4 text-primary" />
                        ) : (
                          <Package className="w-4 h-4 text-amber-600" />
                        )}
                        {pos.label}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Bemerkungen (optional)</h2>
                <textarea
                  value={bemerkung}
                  onChange={(e) => setBemerkung(e.target.value)}
                  placeholder="Zusätzliche Bemerkungen zum Protokoll..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={4}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-700">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="border-t bg-white sticky bottom-0">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)}
              className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Weiter
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Wird erstellt...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Protokoll erstellen
                </>
              )}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
