import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.REPORTS_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const reports = await (prisma as any).report.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(
      reports.map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        definition: r.definition,
        createdBy: r.createdBy,
        creator: r.creator,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error('Error in GET /api/reports:', error);
    return NextResponse.json({ error: 'Datenbankfehler', details: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.REPORTS_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const name = String(body?.name ?? '').trim();
    const description = body?.description === undefined ? null : String(body.description);
    const definition = body?.definition;

    if (!name) {
      return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 });
    }
    if (!definition || typeof definition !== 'object') {
      return NextResponse.json({ error: 'definition ist erforderlich' }, { status: 400 });
    }

    const report = await (prisma as any).report.create({
      data: {
        name,
        description,
        definition,
        createdBy: auth.user.id,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: report.id });
  } catch (error) {
    console.error('Error in POST /api/reports:', error);
    return NextResponse.json({ error: 'Fehler beim Erstellen', details: String(error) }, { status: 500 });
  }
}
