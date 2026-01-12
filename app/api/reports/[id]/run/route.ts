import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';
import { executeReportDefinition, type ReportDefinitionV1, type ReportDefinitionV2, type ReportDefinitionV3 } from '@/lib/reports';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function isSupportedReportDefinition(value: any): value is ReportDefinitionV1 | ReportDefinitionV2 | ReportDefinitionV3 {
  return (
    value &&
    typeof value === 'object' &&
    (value.version === 1 || value.version === 2 || value.version === 3) &&
    typeof value.table === 'string'
  );
}

export async function POST(req: NextRequest, context: RouteContext) {
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

    const report = await (prisma as any).report.findUnique({ where: { id: reportId } });
    if (!report) {
      return NextResponse.json({ error: 'Report nicht gefunden' }, { status: 404 });
    }

    const def = report.definition as any;
    if (!isSupportedReportDefinition(def)) {
      return NextResponse.json({ error: 'Report-Definition wird nicht unterstützt' }, { status: 400 });
    }

    const result = await executeReportDefinition(def);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in POST /api/reports/[id]/run:', error);
    return NextResponse.json({ error: 'Fehler beim Ausführen', details: String(error) }, { status: 500 });
  }
}
