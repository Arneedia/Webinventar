import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST: Set template as default
export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.MASTER_DATA_EDIT);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const templates = (global as any).stickerTemplates || [];
    
    // Set all templates to not default
    templates.forEach((t: any) => {
      t.isDefault = false;
    });

    // Set the selected template as default
    const template = templates.find((t: any) => t.id === id);
    if (!template) {
      return NextResponse.json({ error: 'Vorlage nicht gefunden' }, { status: 404 });
    }

    template.isDefault = true;
    template.updatedAt = new Date().toISOString();

    (global as any).stickerTemplates = templates;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Fehler beim Setzen als Standard' }, { status: 500 });
  }
}
