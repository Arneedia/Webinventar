import { prisma } from './prismaClient';

// Nächste freie Inventarnummer für Büroinventar: BUE-<KAT>-<JJJJ>-<NNNN> bzw. BUE-<JJJJ>-<NNNN>
// (KAT = erste 3 Buchstaben des Kategorienamens)
export async function generateOfficeInventarNr(kategorieId?: number | null): Promise<string> {
  const year = new Date().getFullYear();
  let prefix = 'BUE';

  if (kategorieId) {
    const kategorie = await prisma.bueroKategorie.findUnique({
      where: { ID: Number(kategorieId) },
    });
    if (kategorie) {
      const kuerzel = kategorie.Name
        .replace(/[^a-zA-Z]/g, '')
        .substring(0, 3)
        .toUpperCase();
      if (kuerzel) prefix = `BUE-${kuerzel}`;
    }
  }

  const prefixWithYear = `${prefix}-${year}-`;

  const items = await prisma.bueroInventar.findMany({
    where: { InventarNr: { startsWith: prefixWithYear } },
    select: { InventarNr: true },
  });

  let max = 0;
  for (const item of items) {
    const tail = item.InventarNr?.split('-').pop();
    const n = tail ? parseInt(tail, 10) : NaN;
    if (!Number.isNaN(n) && n > max) max = n;
  }

  // Freie Nummer suchen (InventarNr ist unique)
  for (let i = 1; i <= 100; i++) {
    const candidate = `${prefixWithYear}${String(max + i).padStart(4, '0')}`;
    const exists = await prisma.bueroInventar.findUnique({ where: { InventarNr: candidate } });
    if (!exists) return candidate;
  }

  throw new Error('Keine freie Inventarnummer gefunden');
}
