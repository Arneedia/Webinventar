import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';
import {
  executeReportDefinition,
  toCsv,
  type ReportDefinitionV1,
  type ReportDefinitionV2,
  type ReportDefinitionV3,
} from '@/lib/reports';

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

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.REPORTS_EXPORT);
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
    const csv = toCsv(result.columns, result.rows);

    await (prisma as any).reportExport.create({
      data: {
        reportId: reportId,
        format: 'csv',
        createdBy: auth.user.id,
      },
    });

    const filenameSafe = report.name.replace(/[^a-zA-Z0-9-_]+/g, '_').slice(0, 80) || `report_${report.id}`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filenameSafe}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/reports/[id]/export:', error);
    return NextResponse.json({ error: 'Fehler beim Export', details: String(error) }, { status: 500 });
  }
}
