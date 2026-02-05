-- Fix für alle Auto-Increment Sequenzen im System
-- Datum: 2026-02-04
-- Problem: Sequenzen sind nicht synchron mit den tatsächlichen Daten

-- 1. MOD Tabelle Sequenz reparieren
SELECT setval('"MOD_ModID_seq"', (SELECT COALESCE(MAX("ModID"), 1) FROM "MOD"));

-- 2. BenutzerGER Tabelle Sequenz reparieren
SELECT setval('"BenutzerGER_ID_seq"', (SELECT COALESCE(MAX("ID"), 1) FROM "BenutzerGER"));

-- 3. GER Tabelle Sequenz reparieren (falls nötig)
SELECT setval('"GER_GerID_seq"', (SELECT COALESCE(MAX("GerID"), 1) FROM "GER"));

-- 4. Benutzer Tabelle Sequenz reparieren (falls nötig)
SELECT setval('"Benutzer_BenutzerID_seq"', (SELECT COALESCE(MAX("BenutzerID"), 1) FROM "Benutzer"));

-- 5. ZubehoerBenutzer Tabelle Sequenz reparieren (falls nötig)
SELECT setval('"ZubehoerBenutzer_ID_seq"', (SELECT COALESCE(MAX("ID"), 1) FROM "ZubehoerBenutzer"));

-- 6. ZubehoerInventar Tabelle Sequenz reparieren (falls nötig)
SELECT setval('"ZubehoerInventar_InventarID_seq"', (SELECT COALESCE(MAX("InventarID"), 1) FROM "ZubehoerInventar"));

-- 7. Zubehoer Tabelle Sequenz reparieren (falls nötig)
SELECT setval('"Zubehoer_ZubehoerID_seq"', (SELECT COALESCE(MAX("ZubehoerID"), 1) FROM "Zubehoer"));

-- Verifizierung: Zeige alle Sequenzen und ihre aktuellen Werte
SELECT 
    schemaname,
    sequencename,
    last_value
FROM pg_sequences
WHERE schemaname = 'public'
ORDER BY sequencename;

-- Fertig! Alle Sequenzen sollten jetzt korrekt sein.
