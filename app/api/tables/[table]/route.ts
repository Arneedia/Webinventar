import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/apiError';
import { prisma } from '@/lib/prismaClient';
import { getTableConfig } from '@/lib/tableConfig';
import { requireApiUser, userHasAnyPermission } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';
import { formatInventarCode } from '@/lib/hardwareCodes';
import { generateNextWODISNumber, validateWODISNumber } from '@/lib/wodisNumber';
import { bereichWhere, isBereichScope } from '@/lib/masterDataBereich';

interface RouteContext {
  params: Promise<{ table: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  if (!userHasAnyPermission(auth.user, [AvailablePermissions.MASTER_DATA_VIEW, AvailablePermissions.RELATIONS_VIEW, AvailablePermissions.RELATIONS_DEVICES_VIEW, AvailablePermissions.RELATIONS_OFFICE_VIEW])) {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
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

    // Optional nach Bereich (Geräte/Büro) filtern: ?bereich=GERAETE|BUERO
    const bereich = req.nextUrl.searchParams.get('bereich');
    let where: Record<string, unknown> | undefined;
    if (isBereichScope(bereich)) {
      if (config.name === 'HS' || config.name === 'MOD') where = bereichWhere(bereich);
      if (config.name === 'HS_MOD') where = { HS: bereichWhere(bereich), MOD: bereichWhere(bereich) };
    }

    const rows: any[] = await model.findMany({ include, where });

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
    return apiErrorResponse(error);
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
        value = col.defaultValue ?? null;
      }
      if (col.options && value !== null && !col.options.some((o) => o.value === value)) {
        return NextResponse.json({ error: `Ungültiger Wert für ${col.name}` }, { status: 400 });
      }
      if (value !== null && col.type === 'date' && typeof value === 'string') {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
          value = parsed;
        }
      }
      data[col.name] = value;
    }

    // Automatische InventarCode-Generierung für GER-Tabelle
    if (table.toUpperCase() === 'GER' && !data.InventarCode && data.HWID) {
      const hw = await prisma.hW.findUnique({ where: { HWID: Number(data.HWID) } });
      const prefix = hw?.HWCode || 'HW';

      // Höchste laufende Nummer für dieses Präfix ermitteln
      const existing = await prisma.gER.findMany({
        where: { InventarCode: { startsWith: prefix + '-' } },
        select: { InventarCode: true },
        orderBy: { InventarCode: 'desc' },
        take: 100, // Nur die letzten 100 für Performance
      });

      let maxSeq = 0;
      for (const row of existing) {
        const match = row.InventarCode?.match(/-(\d+)$/);
        if (match) {
          const num = Number(match[1]);
          if (num > maxSeq) maxSeq = num;
        }
      }

      // Versuche bis zu 10 mal eine freie Nummer zu finden
      let attempts = 0;
      let foundFree = false;
      while (!foundFree && attempts < 10) {
        const candidateCode = formatInventarCode(prefix, maxSeq + 1 + attempts);
        const exists = await prisma.gER.findUnique({
          where: { InventarCode: candidateCode },
        });
        if (!exists) {
          data.InventarCode = candidateCode;
          foundFree = true;
        } else {
          attempts++;
        }
      }

      if (!foundFree) {
        return NextResponse.json(
          { error: 'Konnte keinen freien InventarCode generieren. Bitte manuell eingeben.' },
          { status: 500 }
        );
      }
    }

    // Automatische WODIS Nr.-Generierung für GER-Tabelle
    if (table.toUpperCase() === 'GER') {
      if (data.WODISNr) {
        // Manual WODIS Nr. provided - validate it
        if (!validateWODISNumber(data.WODISNr)) {
          return NextResponse.json(
            { error: 'Ungültige WODIS Nr. Format: JJJJNNNNNN (z.B. 2026000001)' },
            { status: 400 }
          );
        }
        // Check if it already exists
        const existingWODIS = await prisma.gER.findUnique({
          where: { WODISNr: data.WODISNr },
        });
        if (existingWODIS) {
          return NextResponse.json(
            { error: 'Diese WODIS Nr. existiert bereits' },
            { status: 409 }
          );
        }
      } else {
        // Auto-generate WODIS Nr.
        data.WODISNr = await generateNextWODISNumber();
      }
    }

    // Automatische Beschreibung für Zubehör-Tabelle aus ZT-Name
    if (table.toUpperCase() === 'ZUBEHOER' && !data.Beschreibung && data.ZTID) {
      const zt = await prisma.zT.findUnique({ 
        where: { ID: Number(data.ZTID) },
        select: { ZTName: true }
      });
      if (zt?.ZTName) {
        data.Beschreibung = zt.ZTName;
      }
    }

    await model.create({ data });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database error (POST /api/tables/[table]):', error);
    return apiErrorResponse(error);
  }
}
