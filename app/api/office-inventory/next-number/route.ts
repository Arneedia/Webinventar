import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';
import { generateOfficeInventarNr } from '@/lib/officeInventarNr';

// Nächste verfügbare Inventarnummer generieren
export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.OFFICE_INVENTORY_CREATE);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const kategorieId = searchParams.get('kategorieId');

    const inventarNr = await generateOfficeInventarNr(kategorieId ? parseInt(kategorieId) : null);

    return NextResponse.json({ inventarNr });
  } catch (error) {
    console.error('Error in GET /api/office-inventory/next-number:', error);
    return NextResponse.json({ error: 'Fehler beim Generieren der Inventarnummer' }, { status: 500 });
  }
}
