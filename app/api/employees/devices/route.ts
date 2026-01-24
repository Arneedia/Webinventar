import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';

export async function GET() {
  try {
    const benutzer = await prisma.benutzer.findMany({
      include: {
        BenutzerGER: {
          where: {
            Ende: null,
          },
          include: {
            GER: {
              include: {
                HW: true,
                HS: true,
                MOD: true,
              },
            },
          },
        },
        ZubehoerBenutzer: {
          where: {
            Ende: null,
          },
          include: {
            Zubehoer: true,
          },
        },
      },
      orderBy: {
        BenutzerName: 'asc',
      },
    });

    const employees = benutzer.map((b: any) => ({
      id: b.BenutzerID,
      name: b.BenutzerName,
      email: b.Email,
      abteilung: b.Abteilung,
      geschaeftsstelle: b.Geschaeftsstelle,
      raum: b.Raum,
      devices: b.BenutzerGER.map((bg: any) => ({
        id: bg.GER.GERID,
        inventarCode: bg.GER.InventarCode,
        sno: bg.GER.SNO,
        hwName: bg.GER.HW?.HWName || null,
        hsName: bg.GER.HS?.HSName || null,
        modelName: bg.GER.MOD?.ModName || null,
        zugang: bg.GER.Zugang,
        preis: bg.GER.Preis,
      })),
      accessories: b.ZubehoerBenutzer.map((zb: any) => ({
        id: zb.ID,
        label: zb.Zubehoer.Label || `Zubehör #${zb.ZubehoerID}`,
        type: zb.Zubehoer.Typ,
        start: zb.Start,
      })),
    }));

    return NextResponse.json({ employees });
  } catch (error) {
    console.error('Fehler beim Laden der Mitarbeiter-Geräte:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Mitarbeiter-Geräte' },
      { status: 500 }
    );
  }
}
