-- Bereich (Geräteverwaltung / Büroinventar / beide) für Hersteller und Modelle
-- Datum: 2026-09-25
-- Beschreibung: Legt fest, in welcher Verwaltung ein Hersteller bzw. Modell in den Auswahllisten erscheint.
--               Werte: 'GERAETE', 'BUERO', 'BEIDE' (Standard)

-- Schritt 1: Spalten anlegen (bestehende Einträge bleiben überall sichtbar)
ALTER TABLE "HS" ADD COLUMN IF NOT EXISTS "Bereich" TEXT NOT NULL DEFAULT 'BEIDE';
ALTER TABLE "MOD" ADD COLUMN IF NOT EXISTS "Bereich" TEXT NOT NULL DEFAULT 'BEIDE';

-- Hinweis: Die Zubehör-Tabelle heißt in der Datenbank (wie im Prisma-@@map) "ZubehÃ¶r"

-- Schritt 2 (optional): Vorbelegung anhand der tatsächlichen Verwendung
-- Nur in Geräten/Zubehör verwendet -> GERAETE
UPDATE "HS" h SET "Bereich" = 'GERAETE'
WHERE (EXISTS (SELECT 1 FROM "GER" g WHERE g."HSID" = h."HSID")
    OR EXISTS (SELECT 1 FROM "ZubehÃ¶r" z WHERE z."HSID" = h."HSID"))
  AND NOT EXISTS (SELECT 1 FROM "BueroInventar" b WHERE LOWER(TRIM(b."Hersteller")) = LOWER(TRIM(h."HSName")));

UPDATE "MOD" m SET "Bereich" = 'GERAETE'
WHERE (EXISTS (SELECT 1 FROM "GER" g WHERE g."MODID" = m."ModID")
    OR EXISTS (SELECT 1 FROM "ZubehÃ¶r" z WHERE z."ModID" = m."ModID"))
  AND NOT EXISTS (SELECT 1 FROM "BueroInventar" b WHERE LOWER(TRIM(b."Modell")) = LOWER(TRIM(m."ModName")));

-- Nur im Büroinventar verwendet -> BUERO
UPDATE "HS" h SET "Bereich" = 'BUERO'
WHERE EXISTS (SELECT 1 FROM "BueroInventar" b WHERE LOWER(TRIM(b."Hersteller")) = LOWER(TRIM(h."HSName")))
  AND NOT EXISTS (SELECT 1 FROM "GER" g WHERE g."HSID" = h."HSID")
  AND NOT EXISTS (SELECT 1 FROM "ZubehÃ¶r" z WHERE z."HSID" = h."HSID");

UPDATE "MOD" m SET "Bereich" = 'BUERO'
WHERE EXISTS (SELECT 1 FROM "BueroInventar" b WHERE LOWER(TRIM(b."Modell")) = LOWER(TRIM(m."ModName")))
  AND NOT EXISTS (SELECT 1 FROM "GER" g WHERE g."MODID" = m."ModID")
  AND NOT EXISTS (SELECT 1 FROM "ZubehÃ¶r" z WHERE z."ModID" = m."ModID");

-- Fertig! Einträge ohne Verwendung bleiben auf 'BEIDE' und können im Admin-Bereich angepasst werden.
