import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaClient";
import { requireApiUser, Roles } from "@/lib/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/devices/[id]/accessories
 * Liefert alle Zubehör-Zuordnungen für ein Gerät (aktiv + abgeschlossen).
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, Roles.USER);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const deviceId = Number(id);
    if (Number.isNaN(deviceId)) {
      return NextResponse.json({ error: "Ungültige Geräte-ID" }, { status: 400 });
    }

    const assignments = await prisma.zubehoerBenutzer.findMany({
      where: { GerID: deviceId },
      include: {
        Zubehoer: {
          select: {
            ZubehoerID: true,
            Beschreibung: true,
            ZT: { select: { ZTName: true } },
          },
        },
        Benutzer: { select: { BenutzerID: true, BenutzerName: true } },
      },
      orderBy: { Start: "desc" },
    });

    const result = assignments.map((a) => ({
      id: a.ID,
      accessoryId: a.ZubehoerID,
      accessoryLabel: a.Zubehoer?.Beschreibung?.trim() || `Zubehör #${a.ZubehoerID}`,
      accessoryType: a.Zubehoer?.ZT?.ZTName ?? null,
      userId: a.BenutzerID,
      userName: a.Benutzer?.BenutzerName ?? null,
      start: a.Start?.toISOString() ?? null,
      end: a.Ende?.toISOString() ?? null,
      status: a.Ende ? "RETURNED" : "ACTIVE",
    }));

    return NextResponse.json({ accessories: result });
  } catch (error) {
    console.error("Error in GET /api/devices/[id]/accessories:", error);
    return NextResponse.json({ error: "Zubehör konnte nicht geladen werden" }, { status: 500 });
  }
}

/**
 * POST /api/devices/[id]/accessories
 * Weist Zubehör aus dem Lager einem Gerät zu.
 * Body: { ZubehoerID: number, BenutzerID?: number }
 * - Prüft Lagerbestand und gibt Fehler zurück, wenn kein Bestand vorhanden.
 * - Erstellt ZubehoerBenutzer-Eintrag (GerID gesetzt).
 * - Bucht automatisch Abgang im ZubehoerInventar (Menge 1).
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, Roles.ADMIN);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const deviceId = Number(id);
    if (Number.isNaN(deviceId)) {
      return NextResponse.json({ error: "Ungültige Geräte-ID" }, { status: 400 });
    }

    const body = await req.json();
    const accessoryId = Number(body.ZubehoerID);
    if (!Number.isInteger(accessoryId)) {
      return NextResponse.json({ error: "ZubehoerID muss eine gültige Zahl sein" }, { status: 400 });
    }

    const userId = body.BenutzerID !== undefined && body.BenutzerID !== null && body.BenutzerID !== ""
      ? Number(body.BenutzerID)
      : null;

    // Inventar-Eintrag mit Bestand > 0 finden (ohne Abgang, Menge >= 1)
    const inventoryEntry = await prisma.zubehoerInventar.findFirst({
      where: {
        ZubehoerID: accessoryId,
        Abgang: null,
        Menge: { gte: 1 },
      },
      orderBy: { Zugang: "asc" }, // Ältesten Bestand zuerst verwenden (FIFO)
    });

    if (!inventoryEntry) {
      return NextResponse.json(
        { error: "Kein Bestand vorhanden. Bitte zuerst Zugang im Inventar buchen." },
        { status: 400 },
      );
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // Zuordnung erstellen (Raw-Insert wegen optionalem BenutzerID)
    await prisma.$executeRawUnsafe(
      'INSERT INTO "ZubehörBenutzer" ("BenutzerID", "ZubehoerID", "GerID", "Start", "Ende") VALUES (?, ?, ?, ?, ?)',
      userId,
      accessoryId,
      deviceId,
      nowIso,
      null,
    );

    // Menge im bestehenden Inventar-Eintrag um 1 reduzieren
    await prisma.zubehoerInventar.update({
      where: { InventarID: inventoryEntry.InventarID },
      data: { Menge: inventoryEntry.Menge - 1 },
    });

    return NextResponse.json({ ok: true, message: "Zubehör zugewiesen und vom Lager abgebucht" }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/devices/[id]/accessories:", error);
    return NextResponse.json({ error: "Zubehör konnte nicht zugewiesen werden" }, { status: 500 });
  }
}
