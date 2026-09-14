-- Mache SNO und HWID optional
-- Datum: 2026-02-06
-- Beschreibung: SNO in GER optional machen, HWID in Zubehör optional machen

-- 1. SNO in GER-Tabelle optional machen
ALTER TABLE "GER" ALTER COLUMN "SNO" DROP NOT NULL;

-- 2. HWID in Zubehör-Tabelle optional machen
-- Foreign Key Constraint entfernen
ALTER TABLE "Zubehör" DROP CONSTRAINT IF EXISTS "Zubehör_HWID_fkey";

-- Spalte auf nullable ändern
ALTER TABLE "Zubehör" ALTER COLUMN "HWID" DROP NOT NULL;

-- Foreign Key Constraint wieder hinzufügen (jetzt mit NULL-Support)
ALTER TABLE "Zubehör" 
ADD CONSTRAINT "Zubehör_HWID_fkey" 
FOREIGN KEY ("HWID") 
REFERENCES "HW"("HWID") 
ON UPDATE CASCADE 
ON DELETE SET NULL;

-- Fertig!
