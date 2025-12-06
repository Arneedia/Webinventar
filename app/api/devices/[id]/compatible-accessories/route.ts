import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prismaClient";
import { requireApiUser } from "@/lib/auth";
import { AvailablePermissions } from "@/lib/permissionGroups";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/devices/[id]/compatible-accessories
 * Liefert alle Zubehör-Artikel, die zum ausgewählten Gerät passen.
 * 
 * Matching-Logik:
 * - HWID muss immer übereinstimmen
 * - HSID muss übereinstimmen, wenn beim Zubehör hinterlegt (> 0)
 * - ModID muss übereinstimmen, wenn beim Zubehör hinterlegt (> 0)
 * 
 * Zusätzlich wird der aktuelle Lagerbestand zurückgegeben.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req, AvailablePermissions.ACCESSORIES_VIEW);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const deviceId = Number(id);
    if (Number.isNaN(deviceId)) {
      return NextResponse.json({ error: "Ungültige Geräte-ID" }, { status: 400 });
    }

    // Gerät laden
    const device = await prisma.gER.findUnique({
      where: { GerID: deviceId },
      select: { HWID: true, HSID: true, MODID: true },
    });

    if (!device) {
      return NextResponse.json({ error: "Gerät nicht gefunden" }, { status: 404 });
    }

    // Alle Zubehör-Artikel laden
    const allAccessories = await prisma.zubehoer.findMany({
      include: {
        ZT: { select: { ZTName: true } },
        HW: { select: { HWName: true } },
        HS: { select: { HSName: true } },
        MOD: { select: { ModName: true } },
        ZubehoerInventar: {
          where: { Abgang: null },
          select: { Menge: true },
        },
      },
    });

    // Filtern: nur passendes Zubehör
    const compatible = allAccessories.filter((acc) => {
      // HWID muss immer passen
      if (acc.HWID !== device.HWID) {
        return false;
      }

      // Wenn HSID beim Zubehör hinterlegt ist (> 0), muss sie passen
      if (acc.HSID != null && acc.HSID > 0 && acc.HSID !== device.HSID) {
        return false;
      }

      // Wenn ModID beim Zubehör hinterlegt ist (> 0), muss sie passen
      if (acc.ModID != null && acc.ModID > 0 && acc.ModID !== device.MODID) {
        return false;
      }

      return true;
    });

    // Bestand berechnen und Ergebnis formatieren
    const result = compatible.map((acc) => {
      const stock = acc.ZubehoerInventar.reduce((sum, inv) => sum + inv.Menge, 0);
      
      // Label zusammenbauen
      const parts: string[] = [];
      if (acc.Beschreibung?.trim()) {
        parts.push(acc.Beschreibung.trim());
      } else {
        parts.push(`Zubehör #${acc.ZubehoerID}`);
      }
      if (acc.ZT?.ZTName) {
        parts.push(`[${acc.ZT.ZTName}]`);
      }

      return {
        id: acc.ZubehoerID,
        label: parts.join(" "),
        stock,
        type: acc.ZT?.ZTName ?? null,
        hwName: acc.HW?.HWName ?? null,
        hsName: acc.HSID != null && acc.HSID > 0 ? acc.HS?.HSName ?? null : null,
        modName: acc.ModID != null && acc.ModID > 0 ? acc.MOD?.ModName ?? null : null,
      };
    });

    return NextResponse.json({ accessories: result });
  } catch (error) {
    console.error("Error in GET /api/devices/[id]/compatible-accessories:", error);
    return NextResponse.json({ error: "Zubehör konnte nicht geladen werden" }, { status: 500 });
  }
}
