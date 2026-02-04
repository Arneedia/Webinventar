import { Boxes, RefreshCw } from "lucide-react";
import type { AccessoryAssignmentSummary, InventoryMovementSummary } from "@/lib/accessories";
import type { MovementFormState, SelectOption } from "../types";
import { useMemo } from "react";
import SearchableSelect from "@/app/components/SearchableSelect";

interface InventoryTabProps {
  accessoryOptions: SelectOption[];
  movements: InventoryMovementSummary[];
  assignments: AccessoryAssignmentSummary[];
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

export default function InventoryTab({
  accessoryOptions,
  movements,
  assignments,
  form,
  onFormChange,
  onSubmit,
}: InventoryTabProps) {
  const assignedByAccessory = useMemo(() => {
    const map = new Map<number, number>();
    assignments.forEach((assignment) => {
      if (assignment.status === 'ACTIVE') {
        map.set(assignment.accessoryId, (map.get(assignment.accessoryId) ?? 0) + 1);
      }
    });
    return map;
  }, [assignments]);

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
          <div className="text-sm text-gray-600 lg:col-span-2">
            <label className="block mb-1">Zubehör *</label>
            <SearchableSelect
              options={accessoryOptions}
              value={form.ZubehoerID}
              onChange={(value) => onFormChange("ZubehoerID", value)}
              placeholder="Zubehör auswählen"
              searchPlaceholder="Zubehör suchen..."
              required
            />
          </div>

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
          <h2 className="text-lg font-semibold text-gray-900">Bestandsübersicht</h2>
          <p className="text-sm text-gray-500">Verfügbare Mengen und Zuordnungen je Zubehör.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Zubehör</th>
                <th className="px-4 py-3 text-center">Verfügbar</th>
                <th className="px-4 py-3 text-center">Vergeben</th>
                <th className="px-4 py-3 text-center">Gesamt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accessoryOptions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                    Noch kein Zubehör angelegt.
                  </td>
                </tr>
              )}
              {accessoryOptions.map((option) => {
                const totalStock = movements
                  .filter((m) => m.accessoryId === option.value)
                  .reduce((sum, m) => sum + (m.direction === 'IN' ? m.quantity : -m.quantity), 0);
                
                const assigned = assignedByAccessory.get(option.value) ?? 0;
                const available = Math.max(0, totalStock - assigned);
                
                return (
                  <tr key={option.value}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {option.label}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        available > 5
                          ? 'bg-emerald-50 text-emerald-700'
                          : available > 0
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                      }`}>
                        {available}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-700">
                      {assigned}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-900">
                      {totalStock}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
