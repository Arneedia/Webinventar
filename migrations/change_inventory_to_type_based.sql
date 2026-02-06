-- Ändere Zubehör-Inventar von Katalog-basiert zu Typ-basiert
-- Datum: 2026-02-06
-- Beschreibung: Inventar wird jetzt direkt mit Zubehör-Typen (ZT) verknüpft statt mit Katalog-Einträgen (Zubehör)

-- Schritt 1: Neue Spalte ZTID hinzufügen
ALTER TABLE "ZubehörInventar" ADD COLUMN "ZTID" INT;

-- Schritt 2: Daten migrieren - ZTID aus Zubehör-Tabelle übernehmen
UPDATE "ZubehörInventar" 
SET "ZTID" = (
  SELECT "ZTID" 
  FROM "Zubehör" 
  WHERE "Zubehör"."ZubehoerID" = "ZubehörInventar"."ZubehoerID"
);

-- Schritt 3: ZTID als NOT NULL setzen
ALTER TABLE "ZubehörInventar" ALTER COLUMN "ZTID" SET NOT NULL;

-- Schritt 4: Foreign Key Constraint für ZubehoerID entfernen
ALTER TABLE "ZubehörInventar" DROP CONSTRAINT IF EXISTS "ZubehörInventar_ZubehoerID_fkey";

-- Schritt 5: Alte Spalte ZubehoerID entfernen
ALTER TABLE "ZubehörInventar" DROP COLUMN "ZubehoerID";

-- Schritt 6: Foreign Key Constraint für ZTID hinzufügen
ALTER TABLE "ZubehörInventar" 
ADD CONSTRAINT "ZubehörInventar_ZTID_fkey" 
FOREIGN KEY ("ZTID") 
REFERENCES "ZT"("ID") 
ON UPDATE CASCADE 
ON DELETE CASCADE;

-- Fertig! Inventar ist jetzt typ-basiert.
-- Katalog-Einträge (Zubehör) dienen nur noch der Kompatibilitätsprüfung.
