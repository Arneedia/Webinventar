/**
 * Client-seitige Helfer fuer aussagekraeftige API-Fehlermeldungen.
 * Gibt URL, HTTP-Status und Server-Details (error/details/code/meta) aus,
 * damit die Browser-Konsole zeigt WAS wo WARUM fehlschlaegt.
 */

export interface ApiErrorPayload {
  error?: string;
  details?: string;
  code?: string;
  meta?: unknown;
}

/** Liest den Response-Body einmal als JSON (leer bei Nicht-JSON). */
export async function readJsonSafe<T = any>(res: Response): Promise<T & ApiErrorPayload> {
  try {
    return (await res.json()) as T & ApiErrorPayload;
  } catch {
    try {
      const text = await res.text();
      return (text ? { details: text.slice(0, 500) } : {}) as T & ApiErrorPayload;
    } catch {
      return {} as T & ApiErrorPayload;
    }
  }
}

/** Baut aus Response + Payload eine lesbare Fehlermeldung inkl. Details. */
export function apiErrorMessage(url: string, status: number, payload: ApiErrorPayload): string {
  const parts: string[] = [`${url} -> HTTP ${status}`];
  const msg = payload?.error ?? 'Unbekannter Fehler';
  parts.push(msg);
  if (payload?.code) parts.push(`Code: ${payload.code}`);
  if (payload?.details && payload.details !== msg) parts.push(`Details: ${payload.details}`);
  if (payload?.meta) {
    try {
      parts.push(`Meta: ${JSON.stringify(payload.meta)}`);
    } catch {
      // ignore
    }
  }
  return parts.join(' | ');
}

/** Baut einen Error mit voller Diagnose aus einem bereits geparsten Payload und loggt ihn. */
export function apiError(url: string, status: number, payload: ApiErrorPayload): Error {
  console.error(`[API-Fehler] ${url} -> HTTP ${status}`, payload);
  return new Error(apiErrorMessage(url, status, payload));
}

/** Wirft einen Error mit voller Diagnose und loggt das komplette Payload in die Konsole. */
export async function throwApiError(res: Response, url: string, fallback = 'Anfrage fehlgeschlagen'): Promise<never> {
  const payload = await readJsonSafe(res);
  console.error(`[API-Fehler] ${url} -> HTTP ${res.status}`, payload);
  const message = payload?.error || payload?.details
    ? apiErrorMessage(url, res.status, payload)
    : `${url} -> HTTP ${res.status} | ${fallback}`;
  throw new Error(message);
}

/** Loggt einen bereits gefangenen Fehler mit Kontext in die Konsole. */
export function logApiError(context: string, err: unknown): void {
  console.error(`[API-Fehler] ${context}:`, err);
}
