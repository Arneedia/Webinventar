import { NextResponse } from 'next/server';
import { listTables } from '@/lib/tableConfig';

export async function GET() {
  // Liefert nur Metadaten über alle Tabellen für die Navigation / Übersicht
  const tables = listTables();
  return NextResponse.json(tables);
}
