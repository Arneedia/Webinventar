-- Mache HWID optional in Zubehör-Tabelle
-- Datum: 2026-02-05
-- Beschreibung: Erlaubt das Erstellen von Zubehör ohne Hardware-Typ

-- Schritt 1: Foreign Key Constraint entfernen
ALTER TABLE "Zubehör" DROP CONSTRAINT IF EXISTS "Zubehör_HWID_fkey";

-- Schritt 2: Spalte auf nullable ändern
ALTER TABLE "Zubehör" ALTER COLUMN "HWID" DROP NOT NULL;

-- Schritt 3: Foreign Key Constraint wieder hinzufügen (jetzt mit NULL-Support)
ALTER TABLE "Zubehör" 
ADD CONSTRAINT "Zubehör_HWID_fkey" 
FOREIGN KEY ("HWID") 
REFERENCES "HW"("HWID") 
ON UPDATE CASCADE 
ON DELETE SET NULL;

-- Fertig! Zubehör kann jetzt ohne Hardware-Typ erstellt werden.
