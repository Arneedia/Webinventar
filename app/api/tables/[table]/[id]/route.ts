import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { getTableConfig } from '@/lib/tableConfig';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

interface RouteContext {
  params: Promise<{ table: string; id: string }>;
}

function buildWhere(config: ReturnType<typeof getTableConfig>, id: string) {
  if (!config) return {};

  const pkColumns = config.primaryKey.split(',').map((pk) => pk.trim());
  const idParts = id.split(',');

  const where: Record<string, any> = {};

  pkColumns.forEach((pk, index) => {
    const col = config.columns.find((c) => c.name === pk);
    const raw = idParts[index] ?? idParts[0];

    if (col?.type === 'int' || col?.type === 'decimal') {
      where[pk] = raw === undefined ? null : Number(raw);
    } else {
      where[pk] = raw;
    }
  });

  return where;
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.MASTER_DATA_EDIT);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { table, id } = await context.params;
    const config = getTableConfig(table);

    if (!config) {
      return NextResponse.json({ error: 'Tabelle nicht gefunden' }, { status: 404 });
    }

    const model: any = (prisma as any)[config.model];
    if (!model) {
      return NextResponse.json({ error: 'Prisma-Modell nicht gefunden' }, { status: 500 });
    }

    const body = await req.json();

    const updateColumns = config.columns.filter((c) => !c.identity);
    const data: Record<string, any> = {};

    for (const col of updateColumns) {
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

    const where = buildWhere(config, id);

    await model.update({ where, data });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database error (PUT /api/tables/[table]/[id]):', error);
    return NextResponse.json({ error: 'Datenbankfehler', details: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.MASTER_DATA_EDIT);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { table, id } = await context.params;
    const config = getTableConfig(table);

    if (!config) {
      return NextResponse.json({ error: 'Tabelle nicht gefunden' }, { status: 404 });
    }

    const model: any = (prisma as any)[config.model];
    if (!model) {
      return NextResponse.json({ error: 'Prisma-Modell nicht gefunden' }, { status: 500 });
    }

    const where = buildWhere(config, id);

    await model.delete({ where });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database error (DELETE /api/tables/[table]/[id]):', error);
    return NextResponse.json({ error: 'Datenbankfehler', details: String(error) }, { status: 500 });
  }
}
