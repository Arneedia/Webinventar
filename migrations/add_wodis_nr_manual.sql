-- Manuelle Migration: WODIS Nr. Feld zum GER-Tabelle hinzufügen
-- Datum: 2026-02-02
-- Beschreibung: Fügt das WODISNr Feld hinzu für automatische Nummerierung im Format JJJJNNNNNN

-- Schritt 1: Spalte hinzufügen (nullable, unique)
ALTER TABLE "GER" 
ADD COLUMN "WODISNr" VARCHAR(10) NULL;

-- Schritt 2: Unique Constraint hinzufügen
ALTER TABLE "GER" 
ADD CONSTRAINT "GER_WODISNr_key" UNIQUE ("WODISNr");

-- Schritt 3: Index für bessere Performance bei Abfragen
CREATE INDEX "GER_WODISNr_idx" ON "GER" ("WODISNr");

-- Schritt 4: Kommentar zur Spalte hinzufügen (optional)
COMMENT ON COLUMN "GER"."WODISNr" IS 'WODIS Nummer im Format JJJJNNNNNN (Jahr + 6-stellige fortlaufende Nummer)';

-- Fertig! Die Spalte ist jetzt bereit zur Verwendung.
-- Beim Erstellen neuer Geräte wird automatisch eine WODIS Nr. generiert, falls keine angegeben wird.
