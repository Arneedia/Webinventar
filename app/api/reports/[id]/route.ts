import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser, Roles } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.REPORTS_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const reportId = Number(id);
    if (!Number.isFinite(reportId)) {
      return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 });
    }

    const report = await (prisma as any).report.findUnique({
      where: { id: reportId },
      include: { creator: { select: { id: true, name: true, email: true } } },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({
      id: report.id,
      name: report.name,
      description: report.description,
      definition: report.definition,
      createdBy: report.createdBy,
      creator: report.creator,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error in GET /api/reports/[id]:', error);
    return NextResponse.json({ error: 'Datenbankfehler', details: String(error) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.REPORTS_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const reportId = Number(id);
    if (!Number.isFinite(reportId)) {
      return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 });
    }

    const existing = await (prisma as any).report.findUnique({ where: { id: reportId } });
    if (!existing) {
      return NextResponse.json({ error: 'Report nicht gefunden' }, { status: 404 });
    }

    const isOwner = existing.createdBy === auth.user.id;
    const isAdmin = auth.user.role === Roles.ADMIN;
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    const body = await req.json();
    const name = body?.name === undefined ? undefined : String(body.name).trim();
    const description = body?.description === undefined ? undefined : (body.description === null ? null : String(body.description));
    const definition = body?.definition === undefined ? undefined : body.definition;

    if (name !== undefined && !name) {
      return NextResponse.json({ error: 'Name darf nicht leer sein' }, { status: 400 });
    }
    if (definition !== undefined && (!definition || typeof definition !== 'object')) {
      return NextResponse.json({ error: 'definition ist ungültig' }, { status: 400 });
    }

    await (prisma as any).report.update({
      where: { id: reportId },
      data: {
        name,
        description,
        definition,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /api/reports/[id]:', error);
    return NextResponse.json({ error: 'Fehler beim Speichern', details: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.REPORTS_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const reportId = Number(id);
    if (!Number.isFinite(reportId)) {
      return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 });
    }

    const existing = await (prisma as any).report.findUnique({ where: { id: reportId } });
    if (!existing) {
      return NextResponse.json({ error: 'Report nicht gefunden' }, { status: 404 });
    }

    const isOwner = existing.createdBy === auth.user.id;
    const isAdmin = auth.user.role === Roles.ADMIN;
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
    }

    await (prisma as any).report.delete({ where: { id: reportId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/reports/[id]:', error);
    return NextResponse.json({ error: 'Fehler beim Löschen', details: String(error) }, { status: 500 });
  }
}
