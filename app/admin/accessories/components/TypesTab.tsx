import { ClipboardList, PackagePlus } from "lucide-react";
import type { AccessoryTypeSummary } from "@/lib/accessories";

interface TypesTabProps {
  types: AccessoryTypeSummary[];
  newTypeName: string;
  onTypeNameChange: (value: string) => void;
  onCreateType: (event: React.FormEvent<HTMLFormElement>) => void;
}

export default function TypesTab({ types, newTypeName, onTypeNameChange, onCreateType }: TypesTabProps) {
  return (
    <section className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <ClipboardList className="h-5 w-5 text-blue-500" /> Zubehör-Typen
        </h2>
        <p className="text-sm text-gray-500">Pflege der Stammdaten für Zubehör-Kategorien.</p>
      </div>

      <form onSubmit={onCreateType} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={newTypeName}
          onChange={(event) => onTypeNameChange(event.target.value)}
          placeholder="Neuen Zubehör-Typ eingeben"
          className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500"
        >
          <PackagePlus className="h-4 w-4" /> Hinzufügen
        </button>
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
          </div>
        ))}
      </div>
    </section>
  );
}
