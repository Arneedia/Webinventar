import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth';
import { getAccessoryOverview } from '@/lib/accessories';
import { AvailablePermissions } from '@/lib/permissionGroups';

export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.ACCESSORIES_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const overview = await getAccessoryOverview();
    return NextResponse.json(overview, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/accessories/overview:', error);
    return NextResponse.json({ error: 'Zubehördaten konnten nicht geladen werden' }, { status: 500 });
  }
}
