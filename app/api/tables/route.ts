import { NextRequest, NextResponse } from 'next/server';
import { listTables } from '@/lib/tableConfig';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.MASTER_DATA_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  // Liefert nur Metadaten über alle Tabellen für die Navigation / Übersicht
  const tables = listTables();
  return NextResponse.json(tables);
}
