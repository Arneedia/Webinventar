import { Package, PackagePlus } from "lucide-react";
import type { AccessoryItemSummary, AccessoryTypeSummary } from "@/lib/accessories";
import type { AccessoryFormState, CatalogFilterState, DropdownFilterState, SelectOption } from "../types";

interface CatalogTabProps {
  items: AccessoryItemSummary[];
  types: AccessoryTypeSummary[];
  form: AccessoryFormState;
  filters: CatalogFilterState;
  dropdownFilters: DropdownFilterState;
  hwOptions: SelectOption[];
  hsOptions: SelectOption[];
  modOptions: SelectOption[];
  onFormChange: (field: keyof AccessoryFormState, value: string) => void;
  onFiltersChange: (field: keyof CatalogFilterState, value: string) => void;
  onDropdownFilterChange: (field: keyof DropdownFilterState, value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

const formatModelLabel = (model: AccessoryItemSummary["model"]) => {
  if (!model) {
    return "Modell unbekannt";
  }

  const label = [model.name, model.modellNummer].filter(Boolean).join(" · ");
  return label || `Modell #${model.id}`;
};

const formatManufacturerLabel = (manufacturer: AccessoryItemSummary["manufacturer"]) => {
  if (!manufacturer) {
    return "Hersteller unbekannt";
  }

  if (manufacturer.name && manufacturer.name.trim().length > 0) {
    return manufacturer.name.trim();
  }

  return `Hersteller #${manufacturer.id}`;
};

const formatAccessoryName = (item: AccessoryItemSummary) => {
  if (item.description && item.description.trim().length > 0) {
    return item.description.trim();
  }

  // Format: "Typ für Hersteller Modell"
  const typeName = item.type?.name ?? null;
  const manufacturerName = item.manufacturer?.name?.trim() ?? null;
  const modelName = item.model?.name?.trim() ?? item.model?.modellNummer?.trim() ?? null;

  if (typeName && manufacturerName && modelName) {
    return `${typeName} für ${manufacturerName} ${modelName}`;
  }

  // Fallback wenn nicht alle Teile vorhanden
  const parts = [typeName, manufacturerName, modelName].filter(Boolean);
  return parts.join(" · ") || `Zubehör #${item.id}`;
};

export default function CatalogTab({
  items,
  types,
  form,
  filters,
  dropdownFilters,
  hwOptions,
  hsOptions,
  modOptions,
  onFormChange,
  onFiltersChange,
  onDropdownFilterChange,
  onSubmit,
}: CatalogTabProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-1">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Package className="h-5 w-5 text-primary-dark" /> Zubehör hinzufügen
          </h2>
          <p className="text-sm text-gray-500">Typ, Hardware, Hersteller und Modell verbinden.</p>
        </div>

        <form onSubmit={onSubmit} className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="md:col-span-2 lg:col-span-3 text-sm text-gray-600">
            Name
            <input
              type="text"
              value={form.Beschreibung}
              onChange={(event) => onFormChange("Beschreibung", event.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary-dark focus:outline-none"
              placeholder="z.B. Ladekabel für Samsung Galaxy S23"
            />
          </label>

          <label className="text-sm text-gray-600">
            Typ *
            <select
              required
              value={form.ZTID}
              onChange={(event) => onFormChange("ZTID", event.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary-dark focus:outline-none"
            >
              <option value="">Typ wählen</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>

          <div className="text-sm text-gray-600">
            <span className="block mb-1">Hardware-Typ *</span>
            <div className="space-y-1">
              <input
                type="text"
                placeholder="Hardware-Typ suchen..."
                value={dropdownFilters.hwFilter}
                onChange={(event) => onDropdownFilterChange("hwFilter", event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary-dark focus:outline-none"
              />
              <select
                required
                value={form.HWID}
                onChange={(event) => onFormChange("HWID", event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary-dark focus:outline-none"
              >
                <option value="">-- Hardware-Typ wählen --</option>
                {hwOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} (ID {opt.value})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <span className="block mb-1">Hersteller</span>
            <div className="space-y-1">
              <input
                type="text"
                placeholder="Hersteller suchen..."
                value={dropdownFilters.hsFilter}
                onChange={(event) => onDropdownFilterChange("hsFilter", event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary-dark focus:outline-none"
              />
              <select
                value={form.HSID}
                onChange={(event) => onFormChange("HSID", event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary-dark focus:outline-none"
              >
                <option value="">-- Hersteller wählen (optional) --</option>
                {hsOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} (ID {opt.value})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <span className="block mb-1">Modell</span>
            <div className="space-y-1">
              <input
                type="text"
                placeholder="Modell suchen..."
                value={dropdownFilters.modFilter}
                onChange={(event) => onDropdownFilterChange("modFilter", event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary-dark focus:outline-none"
              />
              <select
                value={form.ModID}
                onChange={(event) => onFormChange("ModID", event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary-dark focus:outline-none"
              >
                <option value="">-- Modell wählen (optional) --</option>
                {modOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} (ID {opt.value})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="lg:col-span-3 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow hover:bg-primary/100"
            >
              <PackagePlus className="h-4 w-4" /> Speichern
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Zubehör-Katalog</h2>
            <p className="text-sm text-gray-500">Filtere nach Typ oder nutze die Volltextsuche.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={filters.type}
              onChange={(event) => onFiltersChange("type", event.target.value)}
              className="rounded-full border border-gray-200 px-4 py-2 text-sm focus:border-primary-dark focus:outline-none"
            >
              <option value="">Alle Typen</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={filters.search}
              onChange={(event) => onFiltersChange("search", event.target.value)}
              placeholder="Suche"
              className="rounded-full border border-gray-200 px-4 py-2 text-sm focus:border-primary-dark focus:outline-none"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.length === 0 && <p className="text-sm text-gray-500">Keine Treffer für die aktuellen Filter.</p>}
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-gray-200 p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-900">{formatAccessoryName(item)}</p>
                <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs text-primary-dark">{item.type.name}</span>
              </div>
              <p className="text-xs text-gray-500">HW: {item.hardware.name || `#${item.hardware.id}`}</p>
              <p className="text-xs text-gray-500">Hersteller: {formatManufacturerLabel(item.manufacturer)}</p>
              <p className="text-xs text-gray-500">Modell: {formatModelLabel(item.model)}</p>
              <div className="flex items-center justify-between pt-2 text-xs">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-0.5 font-medium ${
                    item.stock > 5
                      ? "bg-emerald-50 text-emerald-700"
                      : item.stock > 0
                        ? "bg-amber-50 text-amber-700"
                        : "bg-red-50 text-red-700"
                  }`}
                >
                  Bestand: {item.stock}
                </span>
                <span className="text-gray-500">
                  Aktiv: {item.assignments.active}/{item.assignments.total}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
