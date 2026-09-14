-- Umfassendes Fix-Script für ALLE Auto-Increment Sequenzen
-- Datum: 2026-02-05
-- Dieses Script repariert alle Sequenzen im gesamten System

-- Stammdaten Tabellen
SELECT setval('"ABT_ABTID_seq"', (SELECT COALESCE(MAX("ABTID"), 1) FROM "ABT"));
SELECT setval('"GS_GSID_seq"', (SELECT COALESCE(MAX("GSID"), 1) FROM "GS"));
SELECT setval('"HW_HWID_seq"', (SELECT COALESCE(MAX("HWID"), 1) FROM "HW"));
SELECT setval('"HS_HSID_seq"', (SELECT COALESCE(MAX("HSID"), 1) FROM "HS"));
SELECT setval('"MOD_ModID_seq"', (SELECT COALESCE(MAX("ModID"), 1) FROM "MOD"));
SELECT setval('"STAT_StatusID_seq"', (SELECT COALESCE(MAX("StatusID"), 1) FROM "STAT"));
SELECT setval('"ZT_ID_seq"', (SELECT COALESCE(MAX("ID"), 1) FROM "ZT"));

-- Haupttabellen
SELECT setval('"Benutzer_BenutzerID_seq"', (SELECT COALESCE(MAX("BenutzerID"), 1) FROM "Benutzer"));
SELECT setval('"GER_GerID_seq"', (SELECT COALESCE(MAX("GerID"), 1) FROM "GER"));
SELECT setval('"RAUM_RaumID_seq"', (SELECT COALESCE(MAX("RaumID"), 1) FROM "RAUM"));

-- Zuordnungstabellen
SELECT setval('"BenutzerGER_ID_seq"', (SELECT COALESCE(MAX("ID"), 1) FROM "BenutzerGER"));

-- Zubehör Tabellen (mit Umlauten - @@map)
SELECT setval(pg_get_serial_sequence('"Zubehör"', 'ZubehoerID'), (SELECT COALESCE(MAX("ZubehoerID"), 1) FROM "Zubehör"));
SELECT setval(pg_get_serial_sequence('"ZubehörBenutzer"', 'ID'), (SELECT COALESCE(MAX("ID"), 1) FROM "ZubehörBenutzer"));
SELECT setval(pg_get_serial_sequence('"ZubehörInventar"', 'InventarID'), (SELECT COALESCE(MAX("InventarID"), 1) FROM "ZubehörInventar"));
SELECT setval(pg_get_serial_sequence('"ZubehörBewegung"', 'BewegungsID'), (SELECT COALESCE(MAX("BewegungsID"), 1) FROM "ZubehörBewegung"));

-- Übergabe Tabellen
SELECT setval(pg_get_serial_sequence('"ÜbergabeProtokoll"', 'ProtokollID'), (SELECT COALESCE(MAX("ProtokollID"), 1) FROM "ÜbergabeProtokoll"));
SELECT setval(pg_get_serial_sequence('"ÜbergabePosition"', 'PositionID'), (SELECT COALESCE(MAX("PositionID"), 1) FROM "ÜbergabePosition"));
SELECT setval(pg_get_serial_sequence('"ÜbergabeAufgabe"', 'AufgabeID'), (SELECT COALESCE(MAX("AufgabeID"), 1) FROM "ÜbergabeAufgabe"));

-- Verifizierung: Zeige alle Sequenzen
SELECT 
    schemaname,
    sequencename,
    last_value
FROM pg_sequences
WHERE schemaname = 'public'
ORDER BY sequencename;

-- Fertig! Alle Sequenzen sind jetzt synchron.
