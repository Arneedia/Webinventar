import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser, Roles } from '@/lib/auth';
import { getAccessoryOverview } from '@/lib/accessories';

export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, Roles.ADMIN);
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
