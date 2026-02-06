import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaClient";
import { requireApiUser } from "@/lib/auth";
import { AvailablePermissions } from "@/lib/permissionGroups";

interface RouteContext {
  params: Promise<{ id: string; assignmentId: string }>;
}

/**
 * PUT /api/devices/[id]/accessories/[assignmentId]
 * Beendet eine Zubehör-Zuordnung (Rückgabe).
 * Optional: returnToStock = true → bucht Zugang ins Inventar.
 */
export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.ACCESSORIES_EDIT);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id, assignmentId } = await context.params;
    const deviceId = Number(id);
    const assignId = Number(assignmentId);

    if (Number.isNaN(deviceId) || Number.isNaN(assignId)) {
      return NextResponse.json({ error: "Ungültige IDs" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const returnToStock = body.returnToStock === true;

    // Zuordnung laden (mit Zubehör-Info für ZTID)
    const assignment = await prisma.zubehoerBenutzer.findFirst({
      where: { ID: assignId, GerID: deviceId },
      include: { Zubehoer: { select: { ZTID: true } } },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Zuordnung nicht gefunden" }, { status: 404 });
    }

    if (assignment.Ende) {
      return NextResponse.json({ error: "Zuordnung ist bereits beendet" }, { status: 400 });
    }

    const now = new Date();

    // Zuordnung beenden
    await prisma.zubehoerBenutzer.update({
      where: { ID: assignId },
      data: { Ende: now },
    });

    // Optional: Bestand wieder erhöhen (Menge in bestehendem Eintrag erhöhen oder neuen anlegen)
    if (returnToStock && assignment.Zubehoer) {
      const ztid = assignment.Zubehoer.ZTID;
      
      const existingEntry = await prisma.zubehoerInventar.findFirst({
        where: {
          ZTID: ztid,
          Abgang: null,
        },
        orderBy: { Zugang: "desc" },
      });

      if (existingEntry) {
        await prisma.zubehoerInventar.update({
          where: { InventarID: existingEntry.InventarID },
          data: { Menge: existingEntry.Menge + 1 },
        });
      } else {
        await prisma.zubehoerInventar.create({
          data: {
            ZTID: ztid,
            Menge: 1,
            Zugang: now,
          },
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: returnToStock
        ? "Zubehör zurückgegeben und ins Lager gebucht"
        : "Zubehör-Zuordnung beendet",
    });
  } catch (error) {
    console.error("Error in PUT /api/devices/[id]/accessories/[assignmentId]:", error);
    return NextResponse.json({ error: "Rückgabe fehlgeschlagen" }, { status: 500 });
  }
}

/**
 * DELETE /api/devices/[id]/accessories/[assignmentId]
 * Löscht eine Zubehör-Zuordnung komplett (z.B. bei Fehlbuchung).
 * Optional: returnToStock = true → bucht Zugang ins Inventar.
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.ACCESSORIES_DELETE);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id, assignmentId } = await context.params;
    const deviceId = Number(id);
    const assignId = Number(assignmentId);

    if (Number.isNaN(deviceId) || Number.isNaN(assignId)) {
      return NextResponse.json({ error: "Ungültige IDs" }, { status: 400 });
    }

    const url = new URL(req.url);
    const returnToStock = url.searchParams.get("returnToStock") === "true";

    // Zuordnung laden (mit Zubehör-Info für ZTID)
    const assignment = await prisma.zubehoerBenutzer.findFirst({
      where: { ID: assignId, GerID: deviceId },
      include: { Zubehoer: { select: { ZTID: true } } },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Zuordnung nicht gefunden" }, { status: 404 });
    }

    // Zuordnung löschen
    await prisma.zubehoerBenutzer.delete({
      where: { ID: assignId },
    });

    // Optional: Bestand wieder erhöhen (nur wenn Zuordnung noch aktiv war)
    if (returnToStock && !assignment.Ende && assignment.Zubehoer) {
      const ztid = assignment.Zubehoer.ZTID;
      
      const existingEntry = await prisma.zubehoerInventar.findFirst({
        where: {
          ZTID: ztid,
          Abgang: null,
        },
        orderBy: { Zugang: "desc" },
      });

      if (existingEntry) {
        await prisma.zubehoerInventar.update({
          where: { InventarID: existingEntry.InventarID },
          data: { Menge: existingEntry.Menge + 1 },
        });
      } else {
        await prisma.zubehoerInventar.create({
          data: {
            ZTID: ztid,
            Menge: 1,
            Zugang: new Date(),
          },
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: returnToStock && !assignment.Ende
        ? "Zuordnung gelöscht und Bestand wiederhergestellt"
        : "Zuordnung gelöscht",
    });
  } catch (error) {
    console.error("Error in DELETE /api/devices/[id]/accessories/[assignmentId]:", error);
    return NextResponse.json({ error: "Löschen fehlgeschlagen" }, { status: 500 });
  }
}
