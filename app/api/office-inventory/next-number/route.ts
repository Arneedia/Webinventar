import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

// Nächste verfügbare Inventarnummer generieren
export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.DEVICES_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const kategorieId = searchParams.get('kategorieId');

    // Format: BUE-YYYY-NNNN oder BUE-KAT-YYYY-NNNN
    const year = new Date().getFullYear();
    let prefix = 'BUE';

    // Optional: Kategorie-spezifisches Präfix
    if (kategorieId) {
      const kategorie = await prisma.bueroKategorie.findUnique({
        where: { ID: parseInt(kategorieId) },
      });

      if (kategorie) {
        // Erstelle Kürzel aus Kategorie-Namen (erste 3 Buchstaben, uppercase)
        const katKuerzel = kategorie.Name
          .replace(/[^a-zA-Z]/g, '')
          .substring(0, 3)
          .toUpperCase();
        prefix = `BUE-${katKuerzel}`;
      }
    }

    // Finde die höchste Nummer für dieses Jahr und Präfix
    const pattern = `${prefix}-${year}-%`;
    
    const lastItem = await prisma.bueroInventar.findFirst({
      where: {
        InventarNr: {
          startsWith: `${prefix}-${year}-`,
        },
      },
      orderBy: {
        InventarNr: 'desc',
      },
    });

    let nextNumber = 1;
    
    if (lastItem && lastItem.InventarNr) {
      // Extrahiere die Nummer aus dem Format BUE-YYYY-NNNN oder BUE-KAT-YYYY-NNNN
      const parts = lastItem.InventarNr.split('-');
      const lastNumberStr = parts[parts.length - 1];
      const lastNumber = parseInt(lastNumberStr);
      
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    // Formatiere die Nummer mit führenden Nullen (4 Stellen)
    const formattedNumber = nextNumber.toString().padStart(4, '0');
    const inventarNr = `${prefix}-${year}-${formattedNumber}`;

    return NextResponse.json({ inventarNr, nextNumber });
  } catch (error) {
    console.error('Error in GET /api/office-inventory/next-number:', error);
    return NextResponse.json({ error: 'Fehler beim Generieren der Inventarnummer' }, { status: 500 });
  }
}
