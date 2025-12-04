import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { getTableConfig } from '@/lib/tableConfig';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

interface RouteContext {
  params: Promise<{ table: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.MASTER_DATA_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { table } = await context.params;
    const config = getTableConfig(table);

    if (!config) {
      return NextResponse.json({ error: 'Tabelle nicht gefunden' }, { status: 404 });
    }

    const model: any = (prisma as any)[config.model];
    if (!model) {
      return NextResponse.json({ error: 'Prisma-Modell nicht gefunden' }, { status: 500 });
    }

    // Relationen laut ForeignKey-Konfiguration einbinden
    const include: Record<string, boolean> = {};
    if (config.foreignKeys) {
      for (const fk of config.foreignKeys) {
        include[fk.relationName] = true;
      }
    }

    const rows: any[] = await model.findMany({ include });

    // Daten für UI aufbereiten (zusätzliche *_Display Felder für FKs)
    const data = rows.map((row) => {
      const plain: Record<string, unknown> = {};

      for (const col of config.columns) {
        plain[col.name] = row[col.name];
      }

      if (config.foreignKeys) {
        for (const fk of config.foreignKeys) {
          const rel = row[fk.relationName];
          plain[`${fk.column}_Display`] = rel ? rel[fk.displayColumn] : null;
        }
      }

      return plain;
    });

    const clientConfig = {
      name: config.name,
      displayName: config.displayName,
      primaryKey: config.primaryKey,
      columns: config.columns,
      foreignKeys: config.foreignKeys?.map(({ column, refTable, displayColumn }) => ({
        column,
        refTable,
        displayColumn,
      })),
    };

    return NextResponse.json({ config: clientConfig, data });
  } catch (error) {
    console.error('Database error (GET /api/tables/[table]):', error);
    return NextResponse.json({ error: 'Datenbankfehler', details: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.MASTER_DATA_EDIT);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { table } = await context.params;
    const config = getTableConfig(table);

    if (!config) {
      return NextResponse.json({ error: 'Tabelle nicht gefunden' }, { status: 404 });
    }

    const model: any = (prisma as any)[config.model];
    if (!model) {
      return NextResponse.json({ error: 'Prisma-Modell nicht gefunden' }, { status: 500 });
    }

    const body = await req.json();

    // Identity-Spalten beim Insert überspringen
    const insertColumns = config.columns.filter((c) => !c.identity);
    const data: Record<string, any> = {};

    for (const col of insertColumns) {
      let value = body[col.name];
      if (value === '' || value === undefined) {
        value = null;
      }
      if (value !== null && col.type === 'date' && typeof value === 'string') {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
          value = parsed;
        }
      }
      data[col.name] = value;
    }

    await model.create({ data });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database error (POST /api/tables/[table]):', error);
    return NextResponse.json({ error: 'Datenbankfehler', details: String(error) }, { status: 500 });
  }
}
