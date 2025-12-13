'use client';

export default function ScanPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center space-y-4">
          <h1 className="text-2xl font-semibold text-gray-900">Scan-Funktion deaktiviert</h1>
          <p className="text-gray-600">
            Der QR-Scanner wurde entfernt. Bitte nutze die Geräte-Suche oder gib den Inventarcode manuell ein.
          </p>
          <div className="flex justify-center">
            <a
              href="/geraete"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-secondary"
            >
              Geräteübersicht öffnen
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
