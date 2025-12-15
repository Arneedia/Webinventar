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

interface DeviceProtocol {
  id: number;
  protokollNr: string;
  typ: string;
  status: string;
  erstelltAm: string;
  benutzerName: string | null;
  erstellerName: string | null;
}

interface TaskInput {
  titel: string;
  beschreibung: string;
  faelligAm: string | null;
}

interface DeviceDetail {
}

interface ZubehoerOption {
  id: number;
  typ: string | null;
  hersteller: string | null;
  modell: string | null;
  beschreibung: string | null;
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
  const [tasks, setTasks] = useState<TaskInput[]>([]);

  const defaultTasks: Record<ProtocolTyp, TaskInput[]> = {
    AUSGABE: [
      { titel: 'User-Account anlegen', beschreibung: 'AD/Email/SSO', faelligAm: null },
      { titel: 'Notebook vorbereiten', beschreibung: 'Updates, Basis-Software', faelligAm: null },
      { titel: 'Zugänge & Rechte setzen', beschreibung: 'Teams, DMS, Fachanwendungen', faelligAm: null },
    ],
    RUECKGABE: [
      { titel: 'Geräte zurücknehmen', beschreibung: 'Notebook, Zubehör prüfen', faelligAm: null },
      { titel: 'Accounts sperren', beschreibung: 'AD/Email/SSO', faelligAm: null },
      { titel: 'Daten sichern/übergeben', beschreibung: 'Projekt- und Personaldaten', faelligAm: null },
    ],
    TAUSCH: [
      { titel: 'Altgerät sichern', beschreibung: 'Daten übertragen/Backup', faelligAm: null },
      { titel: 'Neues Gerät einrichten', beschreibung: 'Software & Rechte', faelligAm: null },
    ],
  };

  const loadTasksForTyp = async (t: ProtocolTyp) => {
    try {
      const res = await fetch(`/api/protocol-task-templates?typ=${encodeURIComponent(t)}`);
      if (!res.ok) throw new Error('Fehler beim Laden der Aufgaben-Vorlagen');
      const json = await res.json();
      const templates = (json.templates as any[]) || [];

      const activeTemplates = templates.filter((x) => x.Aktiv !== false);
      if (activeTemplates.length === 0) {
        setTasks(defaultTasks[t]);
        return;
      }

      const now = new Date();
      const mapped: TaskInput[] = activeTemplates
        .slice()
        .sort((a, b) => (a.Sortierung ?? 0) - (b.Sortierung ?? 0))
        .map((x) => {
          let faelligAm: string | null = null;
          if (typeof x.FaelligInTagen === 'number') {
            const d = new Date(now);
            d.setDate(d.getDate() + x.FaelligInTagen);
            faelligAm = d.toISOString().slice(0, 10);
          }
          return {
            titel: x.Titel,
            beschreibung: x.Beschreibung || '',
            faelligAm,
          };
        });

      setTasks(mapped);
    } catch {
      setTasks(defaultTasks[t]);
    }
  };

  useEffect(() => {
    fetchBenutzer();
  }, []);

  useEffect(() => {
    if (benutzerId && typ) {
      fetchDevices();
      // Zubehör wird jetzt nur gerätespezifisch geladen, sobald ein Gerät gewählt ist
    }
    if (typ) {
      loadTasksForTyp(typ);
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
      setZubehoerOptions(activeAccessories);
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
      setZubehoerOptions([]);
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

  const canProceedStep1 = typ !== '' && benutzerId !== null;
  const canProceedStep2 = selectedPositions.length > 0;

  const handleSubmit = async () => {
    if (!canProceedStep1 || !canProceedStep2) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        typ,
        benutzerId,
        bemerkung,
        positionen: selectedPositions.map((p) =>
          p.type === 'geraet'
            ? {
                gerID: p.id,
                zustand: p.zustand,
                zustandNotiz: p.zustandNotiz,
                vollstaendig: p.vollstaendig,
                fehlendTeile: p.fehlendTeile,
              }
            : {
                zubehoerID: p.id,
                zustand: p.zustand,
                zustandNotiz: p.zustandNotiz,
                vollstaendig: p.vollstaendig,
                fehlendTeile: p.fehlendTeile,
              }
        ),
        aufgaben: tasks,
      };

      const res = await fetch('/api/protocols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Fehler beim Erstellen des Protokolls');
      }

      const data = await res.json();
      router.push(`/protokolle/${data.id}`);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-3xl px-4 py-6 flex items-center gap-3">
          <ClipboardList className="w-8 h-8 text-primary" />
          <div>
            <p className="text-sm text-gray-500">Neues Übergabeprotokoll</p>
            <h1 className="text-xl font-semibold text-gray-900">Onboarding / Offboarding</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        {/* Stepper */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 1, label: 'Typ & Benutzer' },
            { id: 2, label: 'Geräte & Zubehör' },
            { id: 3, label: 'Aufgaben & Abschluss' },
          ].map((s) => {
            const active = step === s.id;
            const done = step > s.id;
            return (
              <div
                key={s.id}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  active ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600'
                } ${done ? 'bg-green-50 border-green-200 text-green-700' : ''}`}
              >
                <div className="font-semibold">Schritt {s.id}</div>
                <div>{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Repeat className="w-5 h-5 text-primary" />
              Protokoll-Typ wählen
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(
                [
                  { key: 'AUSGABE', label: 'Ausgabe', icon: ArrowUpRight },
                  { key: 'RUECKGABE', label: 'Rückgabe', icon: ArrowDownLeft },
                  { key: 'TAUSCH', label: 'Tausch', icon: MonitorSmartphone },
                ] as { key: ProtocolTyp; label: string; icon: any }[]
              ).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTyp(key)}
                  className={`border rounded-lg p-3 flex items-center gap-2 justify-center ${
                    typ === key ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            <div className="pt-2 space-y-3">
              <label className="text-sm font-semibold flex items-center gap-2">
                <User className="w-4 h-4" />
                Mitarbeiter wählen
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    value={benutzerSearch}
                    onChange={(e) => setBenutzerSearch(e.target.value)}
                    placeholder="Suche nach Name, Abteilung, Geschäftsstelle"
                    className="w-full rounded-lg border border-gray-200 pl-10 pr-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="max-h-56 overflow-auto border border-gray-200 rounded-lg divide-y">
                {loadingBenutzer ? (
                  <div className="p-3 text-sm text-gray-500">Lade...</div>
                ) : (
                  filteredBenutzer.map((b) => (
                    <button
                      type="button"
                      key={b.id}
                      onClick={() => setBenutzerId(b.id)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                        benutzerId === b.id ? 'bg-primary/5 text-primary' : ''
                      }`}
                    >
                      <div className="font-medium">{b.name}</div>
                      <div className="text-xs text-gray-600">
                        {[b.abteilung, b.geschaeftsstelle, b.raum].filter(Boolean).join(' • ')}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Geräte & Zubehör auswählen
            </h2>

            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  value={deviceSearch}
                  onChange={(e) => setDeviceSearch(e.target.value)}
                  placeholder="Gerät suchen (Inventarcode, S/N, Modell)"
                  className="w-full rounded-lg border border-gray-200 pl-10 pr-3 py-2 text-sm"
                />
              </div>
              <div className="grid gap-2">
                {loadingDevices ? (
                  <div className="p-3 text-sm text-gray-500">Lade Geräte...</div>
                ) : (
                  relevantDevices.map((d) => {
                    const active = selectedPositions.some((p) => p.type === 'geraet' && p.id === d.id);
                    return (
                      <label
                        key={d.id}
                        className={`border rounded-lg px-3 py-2 text-sm flex items-center justify-between ${
                          active ? 'border-primary bg-primary/5' : 'border-gray-200'
                        }`}
                      >
                        <div>
                          <div className="font-medium">{d.inventarCode}</div>
                          <div className="text-xs text-gray-600">
                            {[d.hwName, d.hsName, d.modName, d.sno].filter(Boolean).join(' • ')}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleDevice(d)}
                          className="w-4 h-4"
                        />
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Zubehör des selektierten Geräts */}
            {selectedDeviceForAccessories && (
              <div className="space-y-2">
                <div className="text-sm font-semibold">Zubehör des Geräts</div>
                <div className="grid gap-2">
                  {loadingZubehoer ? (
                    <div className="p-3 text-sm text-gray-500">Lade Zubehör...</div>
                  ) : (
                    zubehoerOptions.map((z) => {
                      const active = selectedPositions.some((p) => p.type === 'zubehoer' && p.id === z.id);
                      return (
                        <label
                          key={z.id}
                          className={`border rounded-lg px-3 py-2 text-sm flex items-center justify-between ${
                            active ? 'border-primary bg-primary/5' : 'border-gray-200'
                          }`}
                        >
                          <div>
                            <div className="font-medium">{z.typ || 'Zubehör'}</div>
                            <div className="text-xs text-gray-600">{z.beschreibung}</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => toggleZubehoer(z)}
                            className="w-4 h-4"
                          />
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Ausgewählte Positionen */}
            <div className="space-y-3">
              <div className="text-sm font-semibold">Ausgewählte Positionen</div>
              {selectedPositions.length === 0 && (
                <div className="text-sm text-gray-500">Noch keine Positionen ausgewählt.</div>
              )}
              <div className="space-y-3">
                {selectedPositions.map((p, idx) => (
                  <div key={`${p.type}-${p.id}`} className="border border-gray-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>
                        {p.type === 'geraet' ? 'Gerät' : 'Zubehör'}: {p.label}
                      </span>
                      <button
                        type="button"
                        className="text-red-600 text-xs"
                        onClick={() =>
                          setSelectedPositions((prev) => prev.filter((x) => !(x.type === p.type && x.id === p.id)))
                        }
                      >
                        Entfernen
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                      <label className="flex flex-col gap-1">
                        <span className="text-xs text-gray-600">Zustand</span>
                        <select
                          value={p.zustand}
                          onChange={(e) => updatePosition(idx, 'zustand', e.target.value)}
                          className="rounded border border-gray-200 px-2 py-1"
                        >
                          <option value="GUT">GUT</option>
                          <option value="OK">OK</option>
                          <option value="BESCHAEDIGT">BESCHÄDIGT</option>
                        </select>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={p.vollstaendig}
                          onChange={(e) => updatePosition(idx, 'vollstaendig', e.target.checked)}
                        />
                        <span className="text-xs text-gray-600">Vollständig</span>
                      </label>
                      <label className="flex flex-col gap-1 sm:col-span-3">
                        <span className="text-xs text-gray-600">Fehlende Teile</span>
                        <input
                          type="text"
                          value={p.fehlendTeile}
                          onChange={(e) => updatePosition(idx, 'fehlendTeile', e.target.value)}
                          className="rounded border border-gray-200 px-2 py-1"
                        />
                      </label>
                      <label className="flex flex-col gap-1 sm:col-span-3">
                        <span className="text-xs text-gray-600">Notiz</span>
                        <textarea
                          value={p.zustandNotiz}
                          onChange={(e) => updatePosition(idx, 'zustandNotiz', e.target.value)}
                          className="rounded border border-gray-200 px-2 py-1"
                          rows={2}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <section className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              Aufgaben & Abschluss
            </h2>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Bemerkungen</label>
              <textarea
                value={bemerkung}
                onChange={(e) => setBemerkung(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="Optionaler Kommentar"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Aufgabenliste</div>
                <p className="text-xs text-gray-600">
                  Onboarding/Offboarding-Tasks können angepasst, ergänzt oder entfernt werden.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setTasks((prev) => [...prev, { titel: 'Neue Aufgabe', beschreibung: '', faelligAm: null }])
                }
                className="text-sm px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                Aufgabe hinzufügen
              </button>
            </div>

            <div className="space-y-3">
              {tasks.length === 0 && <div className="text-sm text-gray-500">Keine Aufgaben hinzugefügt.</div>}
              {tasks.map((task, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Titel</label>
                      <input
                        type="text"
                        value={task.titel}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTasks((prev) => prev.map((t, i) => (i === idx ? { ...t, titel: val } : t)));
                        }}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="z.B. Account anlegen"
                      />
                    </div>
                    <div className="w-full sm:w-48">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Fällig am</label>
                      <input
                        type="date"
                        value={task.faelligAm ?? ''}
                        onChange={(e) => {
                          const val = e.target.value || null;
                          setTasks((prev) => prev.map((t, i) => (i === idx ? { ...t, faelligAm: val } : t)));
                        }}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Beschreibung</label>
                      <textarea
                        value={task.beschreibung ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTasks((prev) => prev.map((t, i) => (i === idx ? { ...t, beschreibung: val } : t)));
                        }}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        rows={2}
                        placeholder="Details oder Checkliste"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setTasks((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-sm text-red-600 underline self-start"
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex gap-2 items-start">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </section>
        )}
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
