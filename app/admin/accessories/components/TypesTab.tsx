import { ClipboardList, PackagePlus, PencilLine, Trash2 } from "lucide-react";
import type { AccessoryTypeSummary } from "@/lib/accessories";

interface TypesTabProps {
  types: AccessoryTypeSummary[];
  newTypeName: string;
  editingId: number | null;
  onTypeNameChange: (value: string) => void;
  onCreateType: (event: React.FormEvent<HTMLFormElement>) => void;
  onEdit: (id: number, name: string | null) => void;
  onDelete: (id: number) => void;
  onCancelEdit: () => void;
}

export default function TypesTab({
  types,
  newTypeName,
  editingId,
  onTypeNameChange,
  onCreateType,
  onEdit,
  onDelete,
  onCancelEdit,
}: TypesTabProps) {
  return (
    <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <ClipboardList className="h-5 w-5 text-primary-dark" /> Zubehör-Typen
        </h2>
        <p className="text-sm text-gray-500">Pflege der Stammdaten für Zubehör-Kategorien.</p>
      </div>

      <form onSubmit={onCreateType} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={newTypeName}
          onChange={(event) => onTypeNameChange(event.target.value)}
          placeholder="Neuen Zubehör-Typ eingeben"
          className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-primary focus:outline-none"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-dark"
          >
            <PackagePlus className="h-4 w-4" /> {editingId === null ? "Hinzufügen" : "Aktualisieren"}
          </button>
          {editingId !== null && (
            <button type="button" onClick={onCancelEdit} className="text-sm text-gray-600 hover:text-gray-800">
              Abbrechen
            </button>
          )}
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {types.length === 0 && <p className="text-sm text-gray-500">Noch keine Typen vorhanden.</p>}
        {types.map((type) => (
          <div key={type.id} className="rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-900">{type.name}</p>
            <p className="text-xs text-gray-500">ID {type.id}</p>
            <span className="mt-3 inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
              {type.accessoryCount} Zubehörteile
            </span>
            <div className="mt-3 flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => onEdit(type.id, type.name)}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 font-semibold text-gray-700 hover:bg-gray-50"
              >
                <PencilLine className="h-3.5 w-3.5" /> Bearbeiten
              </button>
              <button
                type="button"
                onClick={() => onDelete(type.id)}
                className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1 font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Löschen
              </button>
              {editingId === type.id && (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                  Bearbeitung aktiv
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
