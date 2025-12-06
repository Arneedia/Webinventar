import { Boxes, RefreshCw } from "lucide-react";
import type { InventoryMovementSummary } from "@/lib/accessories";
import type { MovementFormState, SelectOption } from "../types";

interface InventoryTabProps {
  accessoryOptions: SelectOption[];
  movements: InventoryMovementSummary[];
  form: MovementFormState;
  onFormChange: (field: keyof MovementFormState, value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
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

export default function InventoryTab({ accessoryOptions, movements, form, onFormChange, onSubmit }: InventoryTabProps) {
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
                <th className="px-4 py-3">Datum</th>
                <th className="px-4 py-3">Zubehör</th>
                <th className="px-4 py-3">Menge</th>
                <th className="px-4 py-3">Richtung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movements.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                    Noch keine Bewegungen gebucht.
                  </td>
                </tr>
              )}
              {movements.map((movement) => (
                <tr key={movement.id}>
                  <td className="px-4 py-3 text-gray-900">{formatDate(movement.date)}</td>
                  <td className="px-4 py-3 text-gray-600">{movement.note ?? `Zubehör #${movement.accessoryId}`}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{movement.quantity}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium ${directionBadgeClasses[movement.direction]}`}
                    >
                      {directionLabel[movement.direction]}
                    </span>
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
