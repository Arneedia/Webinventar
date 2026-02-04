import { ClipboardCheck, RefreshCcw, UserPlus, Users } from "lucide-react";
import type { AccessoryAssignmentSummary } from "@/lib/accessories";
import type { AssignmentFilterState, AssignmentFormState, SelectOption } from "../types";
import SearchableSelect from "@/app/components/SearchableSelect";

interface AssignmentsTabProps {
  assignments: AccessoryAssignmentSummary[];
  accessoryOptions: SelectOption[];
  userOptions: SelectOption[];
  deviceOptions: SelectOption[];
  form: AssignmentFormState;
  filters: AssignmentFilterState;
  onFormChange: (field: keyof AssignmentFormState, value: string) => void;
  onFiltersChange: (field: keyof AssignmentFilterState, value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onReturn: (assignment: AccessoryAssignmentSummary) => void;
  onDelete: (id: number) => void;
}

const statusBadge: Record<AccessoryAssignmentSummary["status"], string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  RETURNED: "bg-gray-100 text-gray-600",
};

const formatDate = (value: string | null) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString("de-DE", { year: "numeric", month: "2-digit", day: "2-digit" });
};

export default function AssignmentsTab({
  assignments,
  accessoryOptions,
  userOptions,
  deviceOptions,
  form,
  filters,
  onFormChange,
  onFiltersChange,
  onSubmit,
  onReturn,
  onDelete,
}: AssignmentsTabProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2 text-primary-dark">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Zubehör zuordnen</h2>
            <p className="text-sm text-gray-500">Benutzer:innen erhalten und geben Zubehör zurück.</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="text-sm text-gray-600">
            <label className="block mb-1">Benutzer</label>
            <SearchableSelect
              options={userOptions}
              value={form.BenutzerID}
              onChange={(value) => onFormChange("BenutzerID", value)}
              placeholder="Benutzer auswählen"
              searchPlaceholder="Benutzer suchen..."
            />
          </div>

          <div className="text-sm text-gray-600">
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

          <div className="text-sm text-gray-600">
            <label className="block mb-1">Gerät (optional)</label>
            <SearchableSelect
              options={deviceOptions}
              value={form.GerID}
              onChange={(value) => onFormChange("GerID", value)}
              placeholder="Kein Gerät"
              searchPlaceholder="Gerät suchen..."
            />
          </div>

          <label className="text-sm text-gray-600">
            Start
            <input
              type="date"
              value={form.Start}
              onChange={(event) => onFormChange("Start", event.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-gray-600">
            Rückgabe (optional)
            <input
              type="date"
              value={form.Ende}
              onChange={(event) => onFormChange("Ende", event.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
          </label>

          <div className="lg:col-span-4 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow hover:bg-primary/100"
            >
              <UserPlus className="h-4 w-4" /> Zuordnen
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Bestehende Zuordnungen</h2>
            <p className="text-sm text-gray-500">Filtere nach Status oder suche nach Namen.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={filters.status}
              onChange={(event) => onFiltersChange("status", event.target.value as AssignmentFilterState["status"])}
              className="rounded-full border border-gray-200 px-4 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="all">Alle</option>
              <option value="active">Aktiv</option>
              <option value="returned">Beendet</option>
            </select>
            <input
              type="text"
              value={filters.search}
              onChange={(event) => onFiltersChange("search", event.target.value)}
              placeholder="Suchen nach Benutzer/Zubehör"
              className="rounded-full border border-gray-200 px-4 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-3">
          {assignments.length === 0 && (
            <p className="text-sm text-gray-500">Für die aktuellen Filter keine Zuordnungen gefunden.</p>
          )}
          {assignments.map((assignment) => (
            <div key={assignment.id} className="rounded-2xl border border-gray-200 p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{assignment.userName}</p>
                  <p className="text-sm text-gray-500">{assignment.accessoryLabel}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-medium ${statusBadge[assignment.status]}`}
                  >
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    {assignment.status === "ACTIVE" ? "Aktiv" : "Beendet"}
                  </span>
                  {assignment.status === "ACTIVE" && (
                    <button
                      type="button"
                      onClick={() => onReturn(assignment)}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-primary-dark"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" /> Rückgabe buchen
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDelete(assignment.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    Löschen
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-4 text-sm text-gray-600 sm:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Start</p>
                  <p className="font-medium text-gray-900">{formatDate(assignment.start)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Ende</p>
                  <p className="font-medium text-gray-900">
                    {assignment.end ? formatDate(assignment.end) : "Offen"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Gerät</p>
                  <p className="font-medium text-gray-900">
                    {assignment.deviceLabel || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Zuordnung</p>
                  <p className="font-medium text-gray-900">#{assignment.id}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
