import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/auth/me:', error);
    return NextResponse.json({ error: 'Fehler beim Laden des Benutzers', details: String(error) }, { status: 500 });
  }
}
