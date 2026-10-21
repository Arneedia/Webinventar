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

// Struktureller Typ: funktioniert mit PrismaClient und interaktivem TransactionClient
type BereichTx = {
  hS: {
    findUnique(args: {
      where: { HSID: number };
      select: { Bereich: true };
    }): Promise<{ Bereich: string } | null>;
    update(args: { where: { HSID: number }; data: { Bereich: string } }): Promise<unknown>;
  };
  mOD: {
    findUnique(args: {
      where: { ModID: number };
      select: { Bereich: true };
    }): Promise<{ Bereich: string } | null>;
    update(args: { where: { ModID: number }; data: { Bereich: string } }): Promise<unknown>;
  };
};

// Wird beim Anlegen/Erweitern einer Hersteller-Modell-Zuordnung aufgerufen:
// Hersteller und Modell werden (falls nötig) auf "Beide" erweitert, damit die
// Zuordnung in der angegebenen Verwaltung tatsächlich auswählbar ist.
// Es wird nie eingeschränkt — bestehende Sichtbarkeit bleibt erhalten.
export async function widenHsModBereich(
  tx: BereichTx,
  HSID: number,
  ModID: number,
  scope: BereichScope
) {
  const [hs, mod] = await Promise.all([
    tx.hS.findUnique({ where: { HSID }, select: { Bereich: true } }),
    tx.mOD.findUnique({ where: { ModID }, select: { Bereich: true } }),
  ]);

  const updates: Promise<unknown>[] = [];
  if (hs) {
    const next = widenBereich(hs.Bereich, scope);
    if (next !== hs.Bereich) {
      updates.push(tx.hS.update({ where: { HSID }, data: { Bereich: next } }));
    }
  }
  if (mod) {
    const next = widenBereich(mod.Bereich, scope);
    if (next !== mod.Bereich) {
      updates.push(tx.mOD.update({ where: { ModID }, data: { Bereich: next } }));
    }
  }
  if (updates.length) await Promise.all(updates);
}
