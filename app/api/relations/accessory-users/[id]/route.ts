import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaClient";
import { requireApiUser, userHasAnyPermission } from "@/lib/auth";
import { AvailablePermissions } from "@/lib/permissionGroups";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  if (!userHasAnyPermission(auth.user, [AvailablePermissions.ACCESSORIES_EDIT, AvailablePermissions.RELATIONS_EDIT, AvailablePermissions.RELATIONS_DEVICES_EDIT])) {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const idNumber = Number(id);
    if (!Number.isInteger(idNumber)) {
      return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
    }

    const { Ende } = await req.json();

    let endDate: Date | null = null;
    if (Ende) {
      const parsed = new Date(Ende);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Ende ist kein gültiges Datum" }, { status: 400 });
      }
      endDate = parsed;
    }

    const updated = await prisma.zubehoerBenutzer.update({
      where: { ID: idNumber },
      data: { Ende: endDate },
      include: { Benutzer: true, Zubehoer: true, GER: true },
    });

    return NextResponse.json({
      relation: {
        ID: updated.ID,
        BenutzerID: updated.BenutzerID,
        ZubehoerID: updated.ZubehoerID,
        GerID: updated.GerID,
        Start: updated.Start?.toISOString() ?? null,
        Ende: updated.Ende?.toISOString() ?? null,
        userName: updated.Benutzer?.BenutzerName ?? null,
        accessoryName: updated.Zubehoer?.Beschreibung ?? null,
        deviceLabel: updated.GER ? buildDeviceLabel(updated.GER) : null,
      },
    });
  } catch (error) {
    console.error("Error in PUT /api/relations/accessory-users/[id]:", error);
    return NextResponse.json({ error: "Zuordnung konnte nicht aktualisiert werden" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  if (!userHasAnyPermission(auth.user, [AvailablePermissions.ACCESSORIES_DELETE, AvailablePermissions.RELATIONS_EDIT, AvailablePermissions.RELATIONS_DEVICES_EDIT])) {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const idNumber = Number(id);
    if (!Number.isInteger(idNumber)) {
      return NextResponse.json({ error: "Ungültige ID" }, { status: 400 });
    }

    await prisma.zubehoerBenutzer.delete({ where: { ID: idNumber } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/relations/accessory-users/[id]:", error);
    return NextResponse.json({ error: "Zuordnung konnte nicht gelöscht werden" }, { status: 500 });
  }
}

function buildDeviceLabel(device: { GerID: number; SNO: string | null }): string {
  if (!device) return "";
  if (device.SNO && device.SNO.trim().length > 0) {
    return `${device.SNO.trim()} (#${device.GerID})`;
  }
  return `Gerät #${device.GerID}`;
}
