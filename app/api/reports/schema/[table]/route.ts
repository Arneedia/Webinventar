import { NextRequest, NextResponse } from 'next/server';
import { getTableConfig } from '@/lib/tableConfig';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

interface RouteContext {
  params: Promise<{ table: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.REPORTS_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const { table } = await context.params;
  const config = getTableConfig(table);
  if (!config) {
    return NextResponse.json({ error: 'Tabelle nicht gefunden' }, { status: 404 });
  }

  const fkColumns = new Set((config.foreignKeys ?? []).map((fk) => fk.column));

  const columns = [
    ...config.columns
      .filter((c) => !fkColumns.has(c.name))
      .map((c) => ({ name: c.name, type: c.type, nullable: c.nullable, identity: c.identity })),
    ...(config.foreignKeys
      ? config.foreignKeys.map((fk) => ({
          name: fk.displayColumn,
          type: 'varchar',
          nullable: true,
          identity: false,
        }))
      : []),
  ];

  const joins =
    config.foreignKeys?.map((fk) => {
      const refConfig = getTableConfig(fk.refTable);
      return {
        column: fk.column,
        refTable: fk.refTable,
        relationName: fk.relationName,
        displayColumn: fk.displayColumn,
        columns: refConfig
          ? refConfig.columns.map((c) => ({ name: c.name, type: c.type, nullable: c.nullable, identity: c.identity }))
          : [],
      };
    }) ?? [];

  return NextResponse.json({
    name: config.name,
    displayName: config.displayName,
    primaryKey: config.primaryKey,
    columns,
    joins,
  });
}
