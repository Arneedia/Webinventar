import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Get global templates storage
const getTemplates = () => {
  return (global as any).stickerTemplates || [];
};

// PATCH: Update template
export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.MASTER_DATA_EDIT);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const templates = getTemplates();
    const index = templates.findIndex((t: any) => t.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Vorlage nicht gefunden' }, { status: 404 });
    }

    templates[index] = {
      ...templates[index],
      ...body,
      id,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(templates[index]);
  } catch (error) {
    return NextResponse.json({ error: 'Fehler beim Aktualisieren' }, { status: 500 });
  }
}

// DELETE: Delete template
export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.MASTER_DATA_EDIT);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const templates = getTemplates();
    const index = templates.findIndex((t: any) => t.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Vorlage nicht gefunden' }, { status: 404 });
    }

    templates.splice(index, 1);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 });
  }
}
