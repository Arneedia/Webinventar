import { NextResponse } from 'next/server';

interface ErrorLike {
  name?: string;
  message?: string;
  code?: string;
  meta?: unknown;
}

/**
 * Baut aus einem unbekannten Fehler (z.B. Prisma-Fehler P2021/P2003, Verbindungsfehler)
 * eine 500-JSON-Antwort mit maximalen Diagnose-Infos fuer die Browser-Konsole:
 * - error:   menschenlesbarer Fallback-Text
 * - details: Error-Name + komplette Nachricht (bei Prisma inkl. fehlender Tabelle/Spalte)
 * - code:    Fehlercode, falls vorhanden (z.B. Prisma "P2021")
 * - meta:    Prisma-Fehler-Metadaten (z.B. { column: "..." })
 */
export function apiErrorResponse(error: unknown, fallback = 'Datenbankfehler') {
  const err = (error ?? {}) as ErrorLike;
  const details =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error);

  const body: Record<string, unknown> = { error: fallback, details };
  if (typeof err.code === 'string') body.code = err.code;
  if (err.meta !== undefined) {
    try {
      body.meta = JSON.parse(JSON.stringify(err.meta));
    } catch {
      // meta nicht serialisierbar -> weglassen
    }
  }
  return NextResponse.json(body, { status: 500 });
}
