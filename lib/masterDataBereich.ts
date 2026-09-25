// Bereich eines Herstellers/Modells: in welcher Verwaltung er in Auswahllisten erscheint
export const BEREICHE = ['GERAETE', 'BUERO', 'BEIDE'] as const;
export type Bereich = (typeof BEREICHE)[number];
export type BereichScope = Exclude<Bereich, 'BEIDE'>;

export const BEREICH_LABELS: Record<Bereich, string> = {
  GERAETE: 'Geräteverwaltung',
  BUERO: 'Büroinventar',
  BEIDE: 'Beide',
};

export const isBereich = (value: unknown): value is Bereich =>
  typeof value === 'string' && (BEREICHE as readonly string[]).includes(value);

export const isBereichScope = (value: unknown): value is BereichScope => value === 'GERAETE' || value === 'BUERO';

// Ist ein Eintrag mit diesem Bereich in der angegebenen Verwaltung verfügbar?
export const matchesBereich = (bereich: string | null | undefined, scope: BereichScope) =>
  !bereich || bereich === 'BEIDE' || bereich === scope;

// Prisma-Where-Bedingung für HS/MOD
export const bereichWhere = (scope: BereichScope) => ({ Bereich: { in: [scope, 'BEIDE'] } });

// Bereich so erweitern, dass der Eintrag auch in der angegebenen Verwaltung verfügbar ist
export const widenBereich = (bereich: string, scope: BereichScope): Bereich =>
  matchesBereich(bereich, scope) && isBereich(bereich) ? bereich : 'BEIDE';
