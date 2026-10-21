import { NextRequest, NextResponse } from 'next/server';
import { apiErrorResponse } from '@/lib/apiError';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser, userHasAnyPermission } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';
import { isBereichScope, widenHsModBereich, type BereichScope } from '@/lib/masterDataBereich';

interface RouteContext {
  params: Promise<{ hsid: string; modid: string }>;
}

function parseIds(hsid: string, modid: string) {
  const HSID = Number(hsid);
  const ModID = Number(modid);

  if (!Number.isInteger(HSID) || !Number.isInteger(ModID)) {
    throw NextResponse.json({ error: 'Ungültige IDs' }, { status: 400 });
  }

  return { HSID, ModID };
}

function serializeRelation(rel: any) {
  if (!rel) return null;
  return {
    HSID: rel.HSID,
    ModID: rel.ModID,
    HWID: rel.HWID,
    hsName: rel.HS?.HSName ?? null,
    modName: rel.MOD?.ModName ?? null,
    modellNummer: rel.MOD?.ModellNummer ?? null,
    hwName: rel.HW?.HWName ?? null,
    kategorien: (rel.Kategorien ?? []).map((k: any) => ({ ID: k.KategorieID, name: k.Kategorie?.Name ?? '' })),
  };
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  if (!userHasAnyPermission(auth.user, [AvailablePermissions.MASTER_DATA_EDIT, AvailablePermissions.RELATIONS_EDIT, AvailablePermissions.RELATIONS_DEVICES_EDIT, AvailablePermissions.RELATIONS_OFFICE_EDIT])) {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  try {
    const { hsid, modid } = await context.params;
    const { HSID, ModID } = parseIds(hsid, modid);
    const body = await req.json();
    const { HWID } = body;
    const kategorieIds: number[] | undefined = Array.isArray(body.kategorieIds)
      ? body.kategorieIds.map(Number).filter((id: number) => Number.isInteger(id))
      : undefined;

    // Bereichsbezogene Prüfung je nach geändertem Feld
    if (Object.prototype.hasOwnProperty.call(body, 'HWID') && !userHasAnyPermission(auth.user, [AvailablePermissions.MASTER_DATA_EDIT, AvailablePermissions.RELATIONS_EDIT, AvailablePermissions.RELATIONS_DEVICES_EDIT])) {
      return NextResponse.json({ error: 'Keine Berechtigung für Geräte-Zuordnungen' }, { status: 403 });
    }
    if (Object.prototype.hasOwnProperty.call(body, 'kategorieIds') && !userHasAnyPermission(auth.user, [AvailablePermissions.MASTER_DATA_EDIT, AvailablePermissions.RELATIONS_EDIT, AvailablePermissions.RELATIONS_OFFICE_EDIT])) {
      return NextResponse.json({ error: 'Keine Berechtigung für Büro-Zuordnungen' }, { status: 403 });
    }

    const hwIdNumber = HWID === undefined || HWID === null || HWID === '' ? null : Number(HWID);
    if (hwIdNumber !== null && !Number.isInteger(hwIdNumber)) {
      return NextResponse.json({ error: 'HWID muss eine gültige Zahl sein' }, { status: 400 });
    }

    // Betroffene Verwaltungsbereiche aus der Änderung ableiten
    const scopes = new Set<BereichScope>();
    if (isBereichScope(body.bereich)) scopes.add(body.bereich);
    if (Object.prototype.hasOwnProperty.call(body, 'HWID') && hwIdNumber !== null) scopes.add('GERAETE');
    if (kategorieIds !== undefined && kategorieIds.length > 0) scopes.add('BUERO');

    const updated = await prisma.$transaction(async (tx) => {
      await tx.hS_MOD.update({
        where: { HSID_ModID: { HSID, ModID } },
        data: { HWID: hwIdNumber },
      });
      // Kategorie-Verknüpfungen komplett ersetzen, wenn mitgeschickt
      if (kategorieIds !== undefined) {
        await tx.kAT_HS_MOD.deleteMany({ where: { HSID, ModID } });
        if (kategorieIds.length) {
          await tx.kAT_HS_MOD.createMany({
            data: kategorieIds.map((KategorieID) => ({ KategorieID, HSID, ModID })),
            skipDuplicates: true,
          });
        }
      }
      // Hersteller/Modell für die betroffenen Verwaltungsbereiche freischalten
      for (const scope of scopes) {
        await widenHsModBereich(tx, HSID, ModID, scope);
      }
      return tx.hS_MOD.findUniqueOrThrow({
        where: { HSID_ModID: { HSID, ModID } },
        include: { HS: true, MOD: true, HW: true, Kategorien: { include: { Kategorie: true } } },
      });
    });

    return NextResponse.json({ relation: serializeRelation(updated) });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error('Error in PUT /api/relations/hs-mod/[hsid]/[modid]:', error);
    return apiErrorResponse(error, 'Zuordnung konnte nicht aktualisiert werden');
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  if (!userHasAnyPermission(auth.user, [AvailablePermissions.MASTER_DATA_EDIT, AvailablePermissions.RELATIONS_EDIT, AvailablePermissions.RELATIONS_DEVICES_EDIT, AvailablePermissions.RELATIONS_OFFICE_EDIT])) {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  try {
    const { hsid, modid } = await context.params;
    const { HSID, ModID } = parseIds(hsid, modid);

    // Bereich der Zuordnung prüfen (Hardware-Typ = Geräte, Kategorien = Büroinventar)
    const relation = await prisma.hS_MOD.findUnique({
      where: { HSID_ModID: { HSID, ModID } },
      select: { HWID: true, Kategorien: { select: { KategorieID: true } } },
    });
    if (relation?.HWID != null && !userHasAnyPermission(auth.user, [AvailablePermissions.MASTER_DATA_EDIT, AvailablePermissions.RELATIONS_EDIT, AvailablePermissions.RELATIONS_DEVICES_EDIT])) {
      return NextResponse.json({ error: 'Keine Berechtigung für Geräte-Zuordnungen' }, { status: 403 });
    }
    if ((relation?.Kategorien?.length ?? 0) > 0 && !userHasAnyPermission(auth.user, [AvailablePermissions.MASTER_DATA_EDIT, AvailablePermissions.RELATIONS_EDIT, AvailablePermissions.RELATIONS_OFFICE_EDIT])) {
      return NextResponse.json({ error: 'Keine Berechtigung für Büro-Zuordnungen' }, { status: 403 });
    }

    await prisma.hS_MOD.delete({ where: { HSID_ModID: { HSID, ModID } } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error('Error in DELETE /api/relations/hs-mod/[hsid]/[modid]:', error);
    return apiErrorResponse(error, 'Zuordnung konnte nicht gelöscht werden');
  }
}
