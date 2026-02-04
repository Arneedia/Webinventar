-- Fix für HS_MOD Tabelle: Unique Constraint auf ModID entfernen
-- und Composite Primary Key korrekt setzen
-- Datum: 2026-02-04

-- Schritt 1: Prüfen, welche Constraints existieren
-- (Nur zur Info, nicht ausführen - nur anschauen)
-- SELECT conname, contype FROM pg_constraint WHERE conrelid = 'HS_MOD'::regclass;

-- Schritt 2: Unique Constraint auf ModID entfernen (falls vorhanden)
-- Ersetze 'constraint_name' mit dem tatsächlichen Namen aus Schritt 1
-- Mögliche Namen: HS_MOD_ModID_key, MOD_ModID_key, etc.
ALTER TABLE "HS_MOD" DROP CONSTRAINT IF EXISTS "HS_MOD_ModID_key";
ALTER TABLE "HS_MOD" DROP CONSTRAINT IF EXISTS "MOD_ModID_key";

-- Schritt 3: Sicherstellen, dass der Composite Primary Key existiert
-- Falls noch nicht vorhanden, hinzufügen:
DO $$
BEGIN
    -- Prüfen ob Primary Key bereits existiert
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'HS_MOD'::regclass 
        AND contype = 'p'
    ) THEN
        -- Primary Key hinzufügen
        ALTER TABLE "HS_MOD" ADD PRIMARY KEY ("HSID", "ModID");
    END IF;
END $$;

-- Schritt 4: Verifizieren
-- SELECT conname, contype, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'HS_MOD'::regclass;
