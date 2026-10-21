import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiError";
import { prisma } from "@/lib/prismaClient";
import { requireApiUser, userHasAnyPermission } from "@/lib/auth";
import { AvailablePermissions } from "@/lib/permissionGroups";

function serializeRelation(record: any) {
  return {
    ID: record.ID,
    BenutzerID: record.BenutzerID,
    ZubehoerID: record.ZubehoerID,
    GerID: record.GerID,
    Start: record.Start?.toISOString() ?? null,
    Ende: record.Ende?.toISOString() ?? null,
    userName: record.Benutzer?.BenutzerName ?? null,
    accessoryName: record.Zubehoer?.Beschreibung ?? null,
    deviceLabel: record.GER ? buildDeviceLabel(record.GER) : null,
  };
}

function buildDeviceLabel(device: { GerID: number; SNO: string | null }): string {
  if (!device) return "";
  if (device.SNO && device.SNO.trim().length > 0) {
    return `${device.SNO.trim()} (#${device.GerID})`;
  }
  return `Gerät #${device.GerID}`;
}

export async function GET(req: NextRequest) {
  const auth = await requireApiUser(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  if (!userHasAnyPermission(auth.user, [AvailablePermissions.ACCESSORIES_VIEW, AvailablePermissions.RELATIONS_VIEW, AvailablePermissions.RELATIONS_DEVICES_VIEW, AvailablePermissions.RELATIONS_OFFICE_VIEW])) {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  try {
    const relations = await prisma.zubehoerBenutzer.findMany({
      include: {
        Benutzer: true,
        Zubehoer: true,
        GER: true,
      },
      orderBy: [{ Start: "desc" }, { ID: "desc" }],
    });

    return NextResponse.json({ relations: relations.map(serializeRelation) });
  } catch (error) {
    console.error("Error in GET /api/relations/accessory-users:", error);
    return apiErrorResponse(error, "Zuordnungen konnten nicht geladen werden");
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApiUser(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  if (!userHasAnyPermission(auth.user, [AvailablePermissions.ACCESSORIES_CREATE, AvailablePermissions.RELATIONS_EDIT, AvailablePermissions.RELATIONS_DEVICES_EDIT])) {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  try {
    const { BenutzerID, ZubehoerID, GerID, Start, Ende } = await req.json();

    const hasUser = BenutzerID !== undefined && BenutzerID !== null && BenutzerID !== "";
    const hasDevice = GerID !== undefined && GerID !== null && GerID !== "";

    if (!hasUser && !hasDevice) {
      return NextResponse.json(
        { error: "Es muss mindestens ein Benutzer oder ein Gerät ausgewählt werden" },
        { status: 400 },
      );
    }

    let userIdNumber: number | null = null;
    if (hasUser) {
      userIdNumber = Number(BenutzerID);
      if (!Number.isInteger(userIdNumber)) {
        return NextResponse.json({ error: "BenutzerID muss eine gültige Zahl sein" }, { status: 400 });
      }
    }

    const accessoryIdNumber = Number(ZubehoerID);
    if (!Number.isInteger(accessoryIdNumber)) {
      return NextResponse.json({ error: "ZubehoerID muss eine gültige Zahl sein" }, { status: 400 });
    }

    const deviceIdNumber = hasDevice ? Number(GerID) : null;
    if (deviceIdNumber !== null && !Number.isInteger(deviceIdNumber)) {
      return NextResponse.json({ error: "GerID muss eine gültige Zahl sein" }, { status: 400 });
    }

    const startDate = Start ? new Date(Start) : new Date();
    if (Number.isNaN(startDate.getTime())) {
      return NextResponse.json({ error: "Start ist kein gültiges Datum" }, { status: 400 });
    }

    let endDate: Date | null = null;
    if (Ende) {
      const parsed = new Date(Ende);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Ende ist kein gültiges Datum" }, { status: 400 });
      }
      endDate = parsed;
    }

    // Prisma-Create statt Raw-SQL: '?'-Platzhalter sind SQLite-Syntax und
    // schlagen auf PostgreSQL fehl. BenutzerID/GerID sind nullable skalare FKs,
    // daher funktioniert direkte Zuweisung ohne connect.
    await prisma.zubehoerBenutzer.create({
      data: {
        BenutzerID: userIdNumber,
        ZubehoerID: accessoryIdNumber,
        GerID: deviceIdNumber,
        Start: startDate,
        Ende: endDate,
      },
    });

    // Antwort ohne Detailobjekt – Übersicht wird ohnehin über /api/accessories/overview neu geladen.
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/relations/accessory-users:", error);
    return apiErrorResponse(error, "Zuordnung konnte nicht erstellt werden");
  }
}
