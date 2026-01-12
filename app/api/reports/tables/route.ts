import { NextRequest, NextResponse } from 'next/server';
import { listTables } from '@/lib/tableConfig';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.REPORTS_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const tables = listTables();
  return NextResponse.json(tables);
}
