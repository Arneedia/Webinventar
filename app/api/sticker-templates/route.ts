import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

// Initialize global storage for templates
const getGlobalTemplates = () => {
  if (!(global as any).stickerTemplates) {
    (global as any).stickerTemplates = [
  {
    id: '1',
    name: 'Standard Laptop',
    description: 'Optimiert für Laptops und Notebooks',
    layout: 'standard',
    size: 'medium',
    showQR: true,
    showInventarCode: true,
    showSNO: true,
    showHersteller: true,
    showModell: true,
    showHardwareTyp: false,
    qrSize: 80,
    fontSize: 100,
    padding: 8,
    gap: 8,
    primaryColor: '#9ab02e',
    secondaryColor: '#374151',
    backgroundColor: '#ffffff',
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Kompakt Smartphone',
    description: 'Kleine Sticker für Smartphones und Tablets',
    layout: 'compact',
    size: 'small',
    showQR: true,
    showInventarCode: true,
    showSNO: false,
    showHersteller: false,
    showModell: false,
    showHardwareTyp: false,
    qrSize: 70,
    fontSize: 90,
    padding: 6,
    gap: 6,
    primaryColor: '#9ab02e',
    secondaryColor: '#374151',
    backgroundColor: '#ffffff',
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
    ];
  }
  return (global as any).stickerTemplates;
};

// GET: List all templates
export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.MASTER_DATA_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const templates = getGlobalTemplates();
  return NextResponse.json(templates);
}

// POST: Create new template
export async function POST(req: NextRequest) {
  const auth = await requireApiUser(req, AvailablePermissions.MASTER_DATA_EDIT);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const newTemplate = {
      ...body,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const templates = getGlobalTemplates();
    templates.push(newTemplate);
    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Fehler beim Erstellen der Vorlage' }, { status: 500 });
  }
}
