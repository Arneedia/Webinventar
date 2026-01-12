import { Boxes, RefreshCw, Save } from "lucide-react";
import type { InventoryMovementSummary } from "@/lib/accessories";
import type { MovementFormState, SelectOption } from "../types";
import { useEffect, useMemo, useState } from "react";

interface InventoryTabProps {
  accessoryOptions: SelectOption[];
  movements: InventoryMovementSummary[];
  form: MovementFormState;
  onFormChange: (field: keyof MovementFormState, value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onDelete: (id: number) => void;
  onUpdateQuantity: (id: number, quantity: number) => void;
}

const directionLabel: Record<MovementFormState["direction"], string> = {
  IN: "Zugang",
  OUT: "Abgang",
};

const directionBadgeClasses: Record<MovementFormState["direction"], string> = {
  IN: "bg-emerald-50 text-emerald-700",
  OUT: "bg-rose-50 text-rose-700",
};

const formatDate = (value: string) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString("de-DE", { year: "numeric", month: "2-digit", day: "2-digit" });
};

export default function InventoryTab({
  accessoryOptions,
  movements,
  form,
  onFormChange,
  onSubmit,
  onDelete,
  onUpdateQuantity,
}: InventoryTabProps) {
  const [quantities, setQuantities] = useState<Record<number, string>>({});

  const accessoryLabelById = useMemo(() => {
    const map = new Map<number, string>();
    accessoryOptions.forEach((option) => {
      map.set(option.value, option.label);
    });
    return map;
  }, [accessoryOptions]);

  useEffect(() => {
    const next: Record<number, string> = {};
    movements.forEach((m) => {
      next[m.id] = String(m.quantity);
    });
    setQuantities(next);
  }, [movements]);

  const handleQuantityChange = (id: number, value: string) => {
    setQuantities((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2 text-primary-dark">
            <Boxes className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Bestandsbewegung buchen</h2>
            <p className="text-sm text-gray-500">Zugänge oder Abgänge dokumentieren.</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-gray-600 lg:col-span-2">
            Zubehör *
            <select
              required
              value={form.ZubehoerID}
              onChange={(event) => onFormChange("ZubehoerID", event.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">Zubehör auswählen</option>
              {accessoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-gray-600">
            Richtung
            <select
              value={form.direction}
              onChange={(event) => onFormChange("direction", event.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="IN">Zugang</option>
              <option value="OUT">Abgang</option>
            </select>
          </label>

          <label className="text-sm text-gray-600">
            Menge
            <input
              type="number"
              min={1}
              value={form.Menge}
              onChange={(event) => onFormChange("Menge", event.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-gray-600">
            Datum
            <input
              type="date"
              value={form.date}
              onChange={(event) => onFormChange("date", event.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
          </label>

          <div className="lg:col-span-4 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow hover:bg-primary-dark"
            >
              <RefreshCw className="h-4 w-4" /> Buchen
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Letzte Bewegungen</h2>
          <p className="text-sm text-gray-500">Chronologische Liste der gebuchten Vorgänge.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Zubehör</th>
                <th className="px-4 py-3">Menge</th>
                <th className="px-4 py-3 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movements.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500">
                    Noch keine Bewegungen gebucht.
                  </td>
                </tr>
              )}
              {movements.map((movement) => (
                <tr key={movement.id}>
                  <td className="px-4 py-3 text-gray-600">
                    {accessoryLabelById.get(movement.accessoryId) ??
                      movement.note ??
                      `Zubehör #${movement.accessoryId}`}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={1}
                      value={quantities[movement.id] ?? ""}
                      onChange={(event) => handleQuantityChange(movement.id, event.target.value)}
                      className="w-24 rounded-lg border border-gray-200 px-3 py-1 text-sm focus:border-primary focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onDelete(movement.id)}
                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Löschen
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(movement.id, Number(quantities[movement.id] ?? movement.quantity))}
                      className="ml-2 rounded-full border border-primary/40 px-3 py-1 text-xs font-semibold text-primary-dark hover:bg-primary/10"
                    >
                      <Save className="mr-1 inline h-3.5 w-3.5" />
                      Speichern
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
