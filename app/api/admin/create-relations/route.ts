import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('🚀 Starte Anlegen von Hersteller-Modell-Zuordnungen...');

    // Alle Hersteller laden
    const hersteller = await prisma.hS.findMany({
      select: { HSID: true, HSName: true }
    });

    // Alle Modelle laden
    const modelle = await prisma.mOD.findMany({
      select: { ModID: true, ModName: true, ModellNummer: true }
    });

    // Alle Hardware-Typen laden
    const hwTypen = await prisma.hW.findMany({
      select: { HWID: true, HWName: true }
    });

    console.log(`📊 Gefunden: ${hersteller.length} Hersteller, ${modelle.length} Modelle, ${hwTypen.length} Hardware-Typen`);

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Zuordnungen definieren
    const zuordnungen = [
      // Apple Geräte
      { hs: 'Apple', mod: 'iPhone', hw: 'Smartphone' },
      { hs: 'Apple', mod: 'iPad', hw: 'Tablet' },
      { hs: 'Apple', mod: 'MacBook', hw: 'Notebook' },
      { hs: 'Apple', mod: 'iMac', hw: 'Desktop' },
      { hs: 'Apple', mod: 'Mac Mini', hw: 'Desktop' },
      
      // Samsung Geräte
      { hs: 'Samsung', mod: 'Galaxy S', hw: 'Smartphone' },
      { hs: 'Samsung', mod: 'Galaxy A', hw: 'Smartphone' },
      { hs: 'Samsung', mod: 'Galaxy Tab', hw: 'Tablet' },
      
      // Dell Geräte
      { hs: 'Dell', mod: 'Latitude', hw: 'Notebook' },
      { hs: 'Dell', mod: 'XPS', hw: 'Notebook' },
      { hs: 'Dell', mod: 'OptiPlex', hw: 'Desktop' },
      { hs: 'Dell', mod: 'Precision', hw: 'Notebook' },
      { hs: 'Dell', mod: 'UltraSharp', hw: 'Monitor' },
      
      // HP Geräte
      { hs: 'HP', mod: 'EliteBook', hw: 'Notebook' },
      { hs: 'HP', mod: 'ProBook', hw: 'Notebook' },
      { hs: 'HP', mod: 'LaserJet', hw: 'Drucker' },
      { hs: 'HP', mod: 'OfficeJet', hw: 'Drucker' },
      
      // Lenovo Geräte
      { hs: 'Lenovo', mod: 'ThinkPad', hw: 'Notebook' },
      { hs: 'Lenovo', mod: 'ThinkCentre', hw: 'Desktop' },
      { hs: 'Lenovo', mod: 'IdeaPad', hw: 'Notebook' },
      { hs: 'Lenovo', mod: 'Yoga', hw: 'Notebook' },
      
      // Microsoft Geräte
      { hs: 'Microsoft', mod: 'Surface Pro', hw: 'Tablet' },
      { hs: 'Microsoft', mod: 'Surface Laptop', hw: 'Notebook' },
      
      // Canon Drucker
      { hs: 'Canon', mod: 'Pixma', hw: 'Drucker' },
      { hs: 'Canon', mod: 'imageRUNNER', hw: 'Drucker' },
      
      // Epson Drucker
      { hs: 'Epson', mod: 'WorkForce', hw: 'Drucker' },
      { hs: 'Epson', mod: 'EcoTank', hw: 'Drucker' },
    ];

    for (const z of zuordnungen) {
      // Hersteller finden
      const hs = hersteller.find(h => h.HSName?.toLowerCase().includes(z.hs.toLowerCase()));
      if (!hs) {
        errors.push(`Hersteller "${z.hs}" nicht gefunden`);
        skipped++;
        continue;
      }

      // Modell finden
      const mod = modelle.find(m => m.ModName?.toLowerCase().includes(z.mod.toLowerCase()));
      if (!mod) {
        errors.push(`Modell "${z.mod}" nicht gefunden`);
        skipped++;
        continue;
      }

      // Hardware-Typ finden
      const hw = hwTypen.find(h => h.HWName?.toLowerCase() === z.hw.toLowerCase());
      if (!hw) {
        errors.push(`Hardware-Typ "${z.hw}" nicht gefunden`);
        skipped++;
        continue;
      }

      try {
        // Prüfen ob bereits existiert
        const existing = await prisma.hS_MOD.findUnique({
          where: {
            HSID_ModID: {
              HSID: hs.HSID,
              ModID: mod.ModID
            }
          }
        });

        if (existing) {
          console.log(`⏭️  Überspringe: ${hs.HSName} → ${mod.ModName} (existiert bereits)`);
          skipped++;
          continue;
        }

        // Zuordnung anlegen
        await prisma.hS_MOD.create({
          data: {
            HSID: hs.HSID,
            ModID: mod.ModID,
            HWID: hw.HWID
          }
        });

        console.log(`✅ Erstellt: ${hs.HSName} → ${mod.ModName} (${hw.HWName})`);
        created++;
      } catch (error) {
        console.error(`❌ Fehler bei ${hs.HSName} → ${mod.ModName}:`, error);
        errors.push(`Fehler bei ${hs.HSName} → ${mod.ModName}: ${error}`);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        created,
        skipped,
        total: created + skipped,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('❌ Fehler:', error);
    return NextResponse.json(
      { error: 'Fehler beim Anlegen der Zuordnungen', details: String(error) },
      { status: 500 }
    );
  }
}
