// Gemeinsame Filterlogik für Hersteller/Modell-Auswahlfelder im Büroinventar.
// Kategorie-Verknüpfungen (KAT_HS_MOD) schränken die Auswahl ein, sobald für die
// gewählte Kategorie mindestens eine Zuordnung existiert; sonst gilt weiterhin
// die Hersteller → Modell Zuordnung (HS_MOD).

export interface HsModPair {
  HSID: number;
  ModID: number;
}

export interface KatHsModPair {
  KategorieID: number;
  HSID: number;
  ModID: number;
}

export interface OfficeSelectResult<T> {
  manufacturers: T[];
  models: T[];
  filtered: boolean;
  hint: string | null;
}

export function filterOfficeSelectOptions<T extends { id: number; name: string }>(
  kategorieId: string | number | null | undefined,
  hersteller: string,
  katRelations: KatHsModPair[],
  hsModRelations: HsModPair[],
  manufacturers: T[],
  models: T[]
): OfficeSelectResult<T> {
  const katId = kategorieId ? Number(kategorieId) : null;
  const katLinks = katId ? katRelations.filter((r) => r.KategorieID === katId) : [];
  const categoryLinked = katLinks.length > 0;

  // Wirksame Hersteller-Modell-Paare: Kategorie-Links, falls vorhanden
  const pairs = categoryLinked ? katLinks : hsModRelations;
  const allowedMfrIds = categoryLinked ? new Set(katLinks.map((r) => r.HSID)) : null;
  const shownManufacturers = allowedMfrIds
    ? manufacturers.filter((m) => allowedMfrIds.has(m.id))
    : manufacturers;

  const hsName = hersteller.trim().toLowerCase();
  const hs = hsName ? manufacturers.find((m) => m.name.toLowerCase() === hsName) : undefined;

  if (hs) {
    const allowedModIds = new Set(pairs.filter((r) => r.HSID === hs.id).map((r) => r.ModID));
    const related = models.filter((m) => allowedModIds.has(m.id));
    if (related.length || categoryLinked) {
      return {
        manufacturers: shownManufacturers,
        models: related,
        filtered: true,
        hint: categoryLinked
          ? 'Gefiltert nach Kategorie und Hersteller'
          : `Gefiltert nach Zuordnungen von „${hersteller.trim()}“`,
      };
    }
  }

  if (categoryLinked) {
    const allowedModIds = new Set(katLinks.map((r) => r.ModID));
    return {
      manufacturers: shownManufacturers,
      models: models.filter((m) => allowedModIds.has(m.id)),
      filtered: true,
      hint: 'Gefiltert nach Kategorie',
    };
  }

  return { manufacturers: shownManufacturers, models, filtered: false, hint: null };
}
