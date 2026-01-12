import { prisma } from '@/lib/prismaClient';
import { getTableConfig } from '@/lib/tableConfig';

export type ReportAggregation =
  | {
      enabled: false;
    }
  | {
      enabled: true;
      groupBy: string;
      op: 'count' | 'sum' | 'avg';
      field?: string;
    };

export type ReportDefinitionV1 = {
  version: 1;
  table: string;
  selectColumns?: string[];
  searchTerm?: string;
  limit?: number;
  aggregation?: ReportAggregation;
};

export type ReportDefinitionV2 = {
  version: 2;
  table: string;
  selectColumns?: string[];
  searchTerm?: string;
  limit?: number;
  aggregation?: ReportAggregation;
};

export type ReportFilterOp = 'eq' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'isNull' | 'notNull';

export type ReportFilter = {
  field: string;
  op: ReportFilterOp;
  value?: unknown;
  value2?: unknown;
};

export type ReportSort = {
  field: string;
  dir: 'asc' | 'desc';
};

export type ReportAggregationMeasure = {
  op: 'count' | 'sum' | 'avg' | 'min' | 'max';
  field?: string;
  as?: string;
};

export type ReportDefinitionV3 = {
  version: 3;
  table: string;
  selectColumns?: string[];
  filters?: ReportFilter[];
  sort?: ReportSort;
  offset?: number;
  limit?: number;
  groupBy?: string;
  measures?: ReportAggregationMeasure[];
};

export type ReportRunResult = {
  columns: string[];
  rows: Record<string, unknown>[];
  aggregation?: {
    groupBy: string;
    op: 'count' | 'sum' | 'avg';
    field?: string;
  };
};

type AnyReportDefinition = ReportDefinitionV1 | ReportDefinitionV2 | ReportDefinitionV3;

function safeNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeSearchable(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function parsePathColumn(col: string): { relation?: string; column: string } {
  const idx = col.indexOf('.');
  if (idx <= 0 || idx === col.length - 1) return { column: col };
  return { relation: col.slice(0, idx), column: col.slice(idx + 1) };
}

function toPrismaValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const d = new Date(`${trimmed}T00:00:00.000Z`);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return value;
}

function buildWhere(
  filters: ReportFilter[] | undefined,
  config: ReturnType<typeof getTableConfig>,
  simplifiedDisplayMap: Map<string, string>
): any {
  if (!filters || filters.length === 0) return undefined;

  const allowedScalar = new Set((config?.columns ?? []).map((c) => c.name));

  const and: any[] = [];
  for (const f of filters) {
    if (!f || typeof f.field !== 'string' || typeof f.op !== 'string') continue;
    const fieldMapped = simplifiedDisplayMap.get(f.field) ?? f.field;
    const parsed = parsePathColumn(fieldMapped);

    const makeCond = (fieldName: string) => {
      switch (f.op) {
        case 'eq':
          return { [fieldName]: { equals: toPrismaValue(f.value) } };
        case 'contains':
          return { [fieldName]: { contains: String(f.value ?? ''), mode: 'insensitive' } };
        case 'gt':
          return { [fieldName]: { gt: toPrismaValue(f.value) } };
        case 'gte':
          return { [fieldName]: { gte: toPrismaValue(f.value) } };
        case 'lt':
          return { [fieldName]: { lt: toPrismaValue(f.value) } };
        case 'lte':
          return { [fieldName]: { lte: toPrismaValue(f.value) } };
        case 'between':
          return { [fieldName]: { gte: toPrismaValue(f.value), lte: toPrismaValue(f.value2) } };
        case 'isNull':
          return { [fieldName]: { equals: null } };
        case 'notNull':
          return { [fieldName]: { not: null } };
        default:
          return null;
      }
    };

    if (parsed.relation) {
      and.push({ [parsed.relation]: makeCond(parsed.column) });
    } else {
      if (!allowedScalar.has(parsed.column)) continue;
      and.push(makeCond(parsed.column));
    }
  }

  return and.length > 0 ? { AND: and } : undefined;
}

export async function executeReportDefinition(def: AnyReportDefinition): Promise<ReportRunResult> {
  const config = getTableConfig(def.table);
  if (!config) {
    throw new Error('Tabelle nicht gefunden');
  }

  const model: any = (prisma as any)[config.model];
  if (!model) {
    throw new Error('Prisma-Modell nicht gefunden');
  }

  const take = (def as any).limit && (def as any).limit > 0 ? Math.min((def as any).limit, 5000) : undefined;

  const selectColumnsRaw = def.selectColumns ?? [];
  const fkMap = new Map<string, { relationName: string; displayColumn: string }>();
  const legacyDisplayMap = new Map<string, string>();
  const simplifiedDisplayMap = new Map<string, string>();
  for (const fk of config.foreignKeys ?? []) {
    fkMap.set(fk.column, { relationName: fk.relationName, displayColumn: fk.displayColumn });
    legacyDisplayMap.set(`${fk.column}_Display`, `${fk.relationName}.${fk.displayColumn}`);
    // UI-friendly: expose the displayColumn without prefix (e.g. HWName)
    // If there are collisions, keep the first mapping (deterministic enough for now).
    if (!simplifiedDisplayMap.has(fk.displayColumn)) {
      simplifiedDisplayMap.set(fk.displayColumn, `${fk.relationName}.${fk.displayColumn}`);
    }
  }

  const effectiveSelectColumnsRaw = selectColumnsRaw.map((c) => {
    const fk = fkMap.get(c);
    if (fk) return `${fk.relationName}.${fk.displayColumn}`;
    const legacy = legacyDisplayMap.get(c);
    if (legacy) return legacy;
    const simplified = simplifiedDisplayMap.get(c);
    if (simplified) return simplified;
    return c;
  });

  const aggregation = def.version === 1 || def.version === 2 ? def.aggregation : undefined;
  const effectiveAggregation =
    aggregation && aggregation.enabled
      ? {
          ...aggregation,
          groupBy: (fkMap.get(aggregation.groupBy)
            ? `${fkMap.get(aggregation.groupBy)!.relationName}.${fkMap.get(aggregation.groupBy)!.displayColumn}`
            : legacyDisplayMap.get(aggregation.groupBy) ?? aggregation.groupBy) as any,
          field:
            aggregation.field && fkMap.get(aggregation.field)
              ? `${fkMap.get(aggregation.field)!.relationName}.${fkMap.get(aggregation.field)!.displayColumn}`
              : aggregation.field
                ? legacyDisplayMap.get(aggregation.field) ?? aggregation.field
                : aggregation.field,
        }
      : aggregation;

  const normalizedAggregation =
    effectiveAggregation && effectiveAggregation.enabled
      ? {
          ...effectiveAggregation,
          groupBy: simplifiedDisplayMap.get(effectiveAggregation.groupBy) ?? effectiveAggregation.groupBy,
          field: effectiveAggregation.field
            ? simplifiedDisplayMap.get(effectiveAggregation.field) ?? effectiveAggregation.field
            : effectiveAggregation.field,
        }
      : effectiveAggregation;
  const requestedRelations = new Set<string>();
  {
    for (const col of effectiveSelectColumnsRaw) {
      const parsed = parsePathColumn(col);
      if (parsed.relation) requestedRelations.add(parsed.relation);
    }
  }

  const include: Record<string, boolean> = {};
  if (config.foreignKeys) {
    for (const fk of config.foreignKeys) {
      if (requestedRelations.has(fk.relationName)) {
        include[fk.relationName] = true;
      }
    }
  }

  for (const rel of requestedRelations) {
    const ok = !!config.foreignKeys?.some((fk) => fk.relationName === rel);
    if (!ok) throw new Error(`Ungültige Relation: ${rel}`);
  }

  if (def.version === 3) {
    const where = buildWhere(def.filters, config, simplifiedDisplayMap);

    const sortFieldRaw = def.sort?.field;
    const sortFieldMapped = sortFieldRaw ? simplifiedDisplayMap.get(sortFieldRaw) ?? sortFieldRaw : undefined;
    const parsedSort = sortFieldMapped ? parsePathColumn(sortFieldMapped) : undefined;

    const orderBy =
      parsedSort && sortFieldMapped
        ? parsedSort.relation
          ? ({ [parsedSort.relation]: { [parsedSort.column]: def.sort?.dir ?? 'asc' } } as any)
          : ({ [parsedSort.column]: def.sort?.dir ?? 'asc' } as any)
        : undefined;

    const skip = def.offset && def.offset > 0 ? Math.min(def.offset, 1_000_000) : undefined;

    const groupByRaw = def.groupBy;
    const groupByMapped = groupByRaw ? simplifiedDisplayMap.get(groupByRaw) ?? groupByRaw : undefined;
    const parsedGroupBy = groupByMapped ? parsePathColumn(groupByMapped) : undefined;

    const measures: ReportAggregationMeasure[] =
      Array.isArray(def.measures) && def.measures.length > 0 ? def.measures : [{ op: 'count' }];

    if (groupByMapped) {
      if (parsedGroupBy && parsedGroupBy.relation) {
        const fk = config.foreignKeys?.find((x) => x.relationName === parsedGroupBy.relation);
        if (!fk) throw new Error('Ungültiges groupBy-Feld');

        const byField = fk.column;
        const groupArgs: any = { by: [byField], where, take };

        for (const m of measures) {
          if (m.op === 'count') {
            groupArgs._count = { _all: true };
            continue;
          }
          if (!m.field) throw new Error('field ist für Aggregation erforderlich');
          const field = m.field;
          groupArgs[`_${m.op}`] = { ...(groupArgs[`_${m.op}`] ?? {}), [field]: true };
        }

        const grouped: any[] = await model.groupBy(groupArgs);
        const ids = grouped.map((g) => g[byField]).filter((x) => x !== null && x !== undefined);

        let idToDisplay = new Map<any, any>();
        const refConfig = getTableConfig(fk.refTable);
        if (refConfig) {
          const refModel: any = (prisma as any)[refConfig.model];
          const pk = refConfig.primaryKey;
          if (refModel && pk && !pk.includes(',')) {
            const refRows: any[] = await refModel.findMany({
              where: { [pk]: { in: ids } },
              select: { [pk]: true, [fk.displayColumn]: true },
            });
            idToDisplay = new Map(refRows.map((r) => [r[pk], r[fk.displayColumn]]));
          }
        }

        const columns = [groupByRaw ?? fk.displayColumn, ...measures.map((m) => m.as ?? `${m.op}${m.field ? `_${m.field}` : ''}`)];
        const rows = grouped.map((g) => {
          const out: Record<string, unknown> = {};
          const keyId = g[byField];
          out[columns[0]] = idToDisplay.get(keyId) ?? keyId ?? '—';
          for (let i = 0; i < measures.length; i++) {
            const m = measures[i];
            const colName = columns[i + 1];
            if (m.op === 'count') out[colName] = g._count?._all ?? 0;
            else out[colName] = g[`_${m.op}`]?.[m.field ?? ''] ?? null;
          }
          return out;
        });

        return { columns, rows };
      }

      if (!parsedGroupBy || parsedGroupBy.relation) throw new Error('Ungültiges groupBy-Feld');

      const allowedScalar = new Set(config.columns.map((c) => c.name));
      if (!allowedScalar.has(parsedGroupBy.column)) throw new Error('Ungültiges groupBy-Feld');

      const groupArgs: any = { by: [parsedGroupBy.column], where, take };
      for (const m of measures) {
        if (m.op === 'count') {
          groupArgs._count = { _all: true };
          continue;
        }
        if (!m.field) throw new Error('field ist für Aggregation erforderlich');
        if (!allowedScalar.has(m.field)) throw new Error('Ungültiges Feld für Aggregation');
        groupArgs[`_${m.op}`] = { ...(groupArgs[`_${m.op}`] ?? {}), [m.field]: true };
      }

      const grouped: any[] = await model.groupBy(groupArgs);
      const columns = [parsedGroupBy.column, ...measures.map((m) => m.as ?? `${m.op}${m.field ? `_${m.field}` : ''}`)];
      const rows = grouped.map((g) => {
        const out: Record<string, unknown> = {};
        out[columns[0]] = g[parsedGroupBy.column] ?? '—';
        for (let i = 0; i < measures.length; i++) {
          const m = measures[i];
          const colName = columns[i + 1];
          if (m.op === 'count') out[colName] = g._count?._all ?? 0;
          else out[colName] = g[`_${m.op}`]?.[m.field ?? ''] ?? null;
        }
        return out;
      });

      return { columns, rows };
    }

    const rows: any[] = await model.findMany({ include, where, orderBy, skip, take });

    const flattened = rows.map((row) => {
      const plain: Record<string, unknown> = {};

      for (const col of config.columns) {
        plain[col.name] = row[col.name];
      }

      if (config.foreignKeys) {
        for (const fk of config.foreignKeys) {
          const rel = row[fk.relationName];
          plain[fk.displayColumn] = rel ? rel[fk.displayColumn] : null;
        }
      }

      return plain;
    });

    const availableV3 = [
      ...config.columns.filter((c) => !(config.foreignKeys ?? []).some((fk) => fk.column === c.name)).map((c) => c.name),
      ...(config.foreignKeys ? config.foreignKeys.map((fk) => fk.displayColumn) : []),
    ];

    const selectColumnsV3 =
      effectiveSelectColumnsRaw.length > 0
        ? effectiveSelectColumnsRaw.map((c) => {
            const parsed = parsePathColumn(c);
            return parsed.relation ? parsed.column : c;
          })
        : availableV3;

    for (const col of selectColumnsV3) {
      if (!availableV3.includes(col)) throw new Error(`Ungültige Spalte: ${col}`);
    }

    const selectedRows = flattened.map((r) => {
      const out: Record<string, unknown> = {};
      for (const col of selectColumnsV3) out[col] = r[col];
      return out;
    });

    return { columns: selectColumnsV3, rows: selectedRows };
  }

  const rows: any[] = await model.findMany({ include, take });

  const flattened = rows.map((row) => {
    const plain: Record<string, unknown> = {};

    for (const col of config.columns) {
      plain[col.name] = row[col.name];
    }

    if (config.foreignKeys) {
      for (const fk of config.foreignKeys) {
        const rel = row[fk.relationName];

        // Backwards-compatible display columns (V1)
        plain[`${fk.column}_Display`] = rel ? rel[fk.displayColumn] : null;

        // Simplified path column: only the displayColumn
        if (include[fk.relationName]) {
          plain[`${fk.relationName}.${fk.displayColumn}`] = rel ? rel[fk.displayColumn] : null;
          plain[fk.displayColumn] = rel ? rel[fk.displayColumn] : null;
        }
      }
    }

    return plain;
  });

  const searchTerm = (def.searchTerm ?? '').trim().toLowerCase();
  const filtered = searchTerm
    ? flattened.filter((r) =>
        Object.values(r).some((v) => normalizeSearchable(v).toLowerCase().includes(searchTerm))
      )
    : flattened;

  const fkColumns = new Set((config.foreignKeys ?? []).map((fk) => fk.column));
  const availableColumns = [
    ...config.columns.filter((c) => !fkColumns.has(c.name)).map((c) => c.name),
    ...(config.foreignKeys ? config.foreignKeys.map((fk) => `${fk.column}_Display`) : []),
    ...(config.foreignKeys ? config.foreignKeys.map((fk) => `${fk.relationName}.${fk.displayColumn}`) : []),
    ...(config.foreignKeys ? config.foreignKeys.map((fk) => fk.displayColumn) : []),
  ];

  const selectColumns =
    effectiveSelectColumnsRaw.length > 0
      ? effectiveSelectColumnsRaw
      : availableColumns.filter((c) => !c.endsWith('_Display') && !c.includes('.'));
  for (const col of selectColumns) {
    if (!availableColumns.includes(col)) {
      throw new Error(`Ungültige Spalte: ${col}`);
    }
  }

  const selectedRows = filtered.map((r) => {
    const out: Record<string, unknown> = {};
    for (const col of selectColumns) {
      out[col] = r[col];
    }
    return out;
  });

  if (!normalizedAggregation || !normalizedAggregation.enabled) {
    return { columns: selectColumns, rows: selectedRows };
  }

  const groupBy = normalizedAggregation.groupBy;
  if (!availableColumns.includes(groupBy)) {
    throw new Error('Ungültiges groupBy-Feld');
  }

  const op = normalizedAggregation.op;
  const field = normalizedAggregation.field;

  if ((op === 'sum' || op === 'avg') && (!field || !availableColumns.includes(field))) {
    throw new Error('Ungültiges Feld für sum/avg');
  }

  const groups = new Map<string, { key: string; count: number; sum: number }>();

  for (const row of selectedRows) {
    const keyRaw = row[groupBy];
    const key = keyRaw === null || keyRaw === undefined ? '—' : String(keyRaw);

    const current = groups.get(key) ?? { key, count: 0, sum: 0 };
    current.count += 1;

    if (op === 'sum' || op === 'avg') {
      if (!field) throw new Error('field ist für sum/avg erforderlich');
      const num = safeNumber(row[field]);
      if (num !== null) current.sum += num;
    }

    groups.set(key, current);
  }

  const aggRows = Array.from(groups.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((g) => {
      let value: number;
      if (op === 'count') value = g.count;
      else if (op === 'sum') value = g.sum;
      else value = g.count > 0 ? g.sum / g.count : 0;

      return {
        [groupBy]: g.key,
        value,
      };
    });

  return {
    columns: [groupBy, 'value'],
    rows: aggRows,
    aggregation: { groupBy, op, field },
  };
}

export function toCsv(columns: string[], rows: Record<string, unknown>[]): string {
  const escape = (val: unknown) => {
    const s = val === null || val === undefined ? '' : String(val);
    const needsQuotes = /[",\n\r;]/.test(s);
    const normalized = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const quoted = normalized.replace(/"/g, '""');
    return needsQuotes ? `"${quoted}"` : quoted;
  };

  const header = columns.map((c) => escape(c)).join(';');
  const lines = rows.map((r) => columns.map((c) => escape(r[c])).join(';'));
  return [header, ...lines].join('\n');
}
