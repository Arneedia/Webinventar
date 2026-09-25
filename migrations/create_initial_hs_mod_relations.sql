-- Initiale Hersteller-Modell-Zuordnungen anlegen
-- Datum: 2026-09-15
-- Beschreibung: Legt sinnvolle Zuordnungen zwischen Herstellern und Modellen an

-- Prüfen, ob bereits Zuordnungen existieren
DO $$
BEGIN
    -- Nur ausführen, wenn noch keine Zuordnungen existieren
    IF NOT EXISTS (SELECT 1 FROM "HS_MOD" LIMIT 1) THEN
        
        -- Apple Geräte (HSID für Apple ermitteln)
        INSERT INTO "HS_MOD" ("HSID", "ModID", "HWID")
        SELECT 
            hs."HSID",
            mod."ModID",
            hw."HWID"
        FROM "HS" hs
        CROSS JOIN "MOD" mod
        LEFT JOIN "HW" hw ON hw."HWName" IN ('Smartphone', 'Tablet', 'Notebook', 'Desktop')
        WHERE hs."HSName" ILIKE '%Apple%'
        AND (
            mod."ModName" ILIKE '%iPhone%' OR
            mod."ModName" ILIKE '%iPad%' OR
            mod."ModName" ILIKE '%MacBook%' OR
            mod."ModName" ILIKE '%iMac%' OR
            mod."ModName" ILIKE '%Mac%'
        )
        AND (
            (mod."ModName" ILIKE '%iPhone%' AND hw."HWName" = 'Smartphone') OR
            (mod."ModName" ILIKE '%iPad%' AND hw."HWName" = 'Tablet') OR
            (mod."ModName" ILIKE '%MacBook%' AND hw."HWName" = 'Notebook') OR
            (mod."ModName" ILIKE '%iMac%' AND hw."HWName" = 'Desktop') OR
            (mod."ModName" ILIKE '%Mac Mini%' AND hw."HWName" = 'Desktop')
        )
        ON CONFLICT ("HSID", "ModID") DO NOTHING;

        -- Samsung Geräte
        INSERT INTO "HS_MOD" ("HSID", "ModID", "HWID")
        SELECT 
            hs."HSID",
            mod."ModID",
            hw."HWID"
        FROM "HS" hs
        CROSS JOIN "MOD" mod
        LEFT JOIN "HW" hw ON hw."HWName" IN ('Smartphone', 'Tablet', 'Monitor', 'Drucker')
        WHERE hs."HSName" ILIKE '%Samsung%'
        AND (
            mod."ModName" ILIKE '%Galaxy%' OR
            mod."ModName" ILIKE '%Tab%' OR
            mod."ModName" ILIKE '%Monitor%'
        )
        AND (
            (mod."ModName" ILIKE '%Galaxy S%' AND hw."HWName" = 'Smartphone') OR
            (mod."ModName" ILIKE '%Galaxy A%' AND hw."HWName" = 'Smartphone') OR
            (mod."ModName" ILIKE '%Tab%' AND hw."HWName" = 'Tablet') OR
            (mod."ModName" ILIKE '%Monitor%' AND hw."HWName" = 'Monitor')
        )
        ON CONFLICT ("HSID", "ModID") DO NOTHING;

        -- Dell Geräte
        INSERT INTO "HS_MOD" ("HSID", "ModID", "HWID")
        SELECT 
            hs."HSID",
            mod."ModID",
            hw."HWID"
        FROM "HS" hs
        CROSS JOIN "MOD" mod
        LEFT JOIN "HW" hw ON hw."HWName" IN ('Notebook', 'Desktop', 'Monitor', 'Server')
        WHERE hs."HSName" ILIKE '%Dell%'
        AND (
            mod."ModName" ILIKE '%Latitude%' OR
            mod."ModName" ILIKE '%XPS%' OR
            mod."ModName" ILIKE '%OptiPlex%' OR
            mod."ModName" ILIKE '%Precision%' OR
            mod."ModName" ILIKE '%PowerEdge%' OR
            mod."ModName" ILIKE '%UltraSharp%'
        )
        AND (
            (mod."ModName" ILIKE '%Latitude%' AND hw."HWName" = 'Notebook') OR
            (mod."ModName" ILIKE '%XPS%' AND hw."HWName" = 'Notebook') OR
            (mod."ModName" ILIKE '%OptiPlex%' AND hw."HWName" = 'Desktop') OR
            (mod."ModName" ILIKE '%Precision%' AND hw."HWName" IN ('Notebook', 'Desktop')) OR
            (mod."ModName" ILIKE '%PowerEdge%' AND hw."HWName" = 'Server') OR
            (mod."ModName" ILIKE '%UltraSharp%' AND hw."HWName" = 'Monitor')
        )
        ON CONFLICT ("HSID", "ModID") DO NOTHING;

        -- HP Geräte
        INSERT INTO "HS_MOD" ("HSID", "ModID", "HWID")
        SELECT 
            hs."HSID",
            mod."ModID",
            hw."HWID"
        FROM "HS" hs
        CROSS JOIN "MOD" mod
        LEFT JOIN "HW" hw ON hw."HWName" IN ('Notebook', 'Desktop', 'Drucker', 'Monitor')
        WHERE hs."HSName" ILIKE '%HP%' OR hs."HSName" ILIKE '%Hewlett%'
        AND (
            mod."ModName" ILIKE '%EliteBook%' OR
            mod."ModName" ILIKE '%ProBook%' OR
            mod."ModName" ILIKE '%Elite%' OR
            mod."ModName" ILIKE '%LaserJet%' OR
            mod."ModName" ILIKE '%OfficeJet%' OR
            mod."ModName" ILIKE '%Pavilion%'
        )
        AND (
            (mod."ModName" ILIKE '%EliteBook%' AND hw."HWName" = 'Notebook') OR
            (mod."ModName" ILIKE '%ProBook%' AND hw."HWName" = 'Notebook') OR
            (mod."ModName" ILIKE '%Elite%' AND hw."HWName" IN ('Desktop', 'Notebook')) OR
            (mod."ModName" ILIKE '%LaserJet%' AND hw."HWName" = 'Drucker') OR
            (mod."ModName" ILIKE '%OfficeJet%' AND hw."HWName" = 'Drucker') OR
            (mod."ModName" ILIKE '%Pavilion%' AND hw."HWName" IN ('Notebook', 'Desktop'))
        )
        ON CONFLICT ("HSID", "ModID") DO NOTHING;

        -- Lenovo Geräte
        INSERT INTO "HS_MOD" ("HSID", "ModID", "HWID")
        SELECT 
            hs."HSID",
            mod."ModID",
            hw."HWID"
        FROM "HS" hs
        CROSS JOIN "MOD" mod
        LEFT JOIN "HW" hw ON hw."HWName" IN ('Notebook', 'Desktop', 'Tablet')
        WHERE hs."HSName" ILIKE '%Lenovo%'
        AND (
            mod."ModName" ILIKE '%ThinkPad%' OR
            mod."ModName" ILIKE '%ThinkCentre%' OR
            mod."ModName" ILIKE '%IdeaPad%' OR
            mod."ModName" ILIKE '%Yoga%'
        )
        AND (
            (mod."ModName" ILIKE '%ThinkPad%' AND hw."HWName" = 'Notebook') OR
            (mod."ModName" ILIKE '%ThinkCentre%' AND hw."HWName" = 'Desktop') OR
            (mod."ModName" ILIKE '%IdeaPad%' AND hw."HWName" = 'Notebook') OR
            (mod."ModName" ILIKE '%Yoga%' AND hw."HWName" IN ('Notebook', 'Tablet'))
        )
        ON CONFLICT ("HSID", "ModID") DO NOTHING;

        -- Microsoft Geräte
        INSERT INTO "HS_MOD" ("HSID", "ModID", "HWID")
        SELECT 
            hs."HSID",
            mod."ModID",
            hw."HWID"
        FROM "HS" hs
        CROSS JOIN "MOD" mod
        LEFT JOIN "HW" hw ON hw."HWName" IN ('Notebook', 'Tablet')
        WHERE hs."HSName" ILIKE '%Microsoft%'
        AND (
            mod."ModName" ILIKE '%Surface%'
        )
        AND (
            (mod."ModName" ILIKE '%Surface Pro%' AND hw."HWName" = 'Tablet') OR
            (mod."ModName" ILIKE '%Surface Laptop%' AND hw."HWName" = 'Notebook') OR
            (mod."ModName" ILIKE '%Surface Book%' AND hw."HWName" = 'Notebook')
        )
        ON CONFLICT ("HSID", "ModID") DO NOTHING;

        -- Canon Drucker
        INSERT INTO "HS_MOD" ("HSID", "ModID", "HWID")
        SELECT 
            hs."HSID",
            mod."ModID",
            hw."HWID"
        FROM "HS" hs
        CROSS JOIN "MOD" mod
        LEFT JOIN "HW" hw ON hw."HWName" = 'Drucker'
        WHERE hs."HSName" ILIKE '%Canon%'
        AND (
            mod."ModName" ILIKE '%Pixma%' OR
            mod."ModName" ILIKE '%imageRUNNER%' OR
            mod."ModName" ILIKE '%i-SENSYS%'
        )
        ON CONFLICT ("HSID", "ModID") DO NOTHING;

        -- Epson Drucker
        INSERT INTO "HS_MOD" ("HSID", "ModID", "HWID")
        SELECT 
            hs."HSID",
            mod."ModID",
            hw."HWID"
        FROM "HS" hs
        CROSS JOIN "MOD" mod
        LEFT JOIN "HW" hw ON hw."HWName" = 'Drucker'
        WHERE hs."HSName" ILIKE '%Epson%'
        AND (
            mod."ModName" ILIKE '%WorkForce%' OR
            mod."ModName" ILIKE '%EcoTank%' OR
            mod."ModName" ILIKE '%Expression%'
        )
        ON CONFLICT ("HSID", "ModID") DO NOTHING;

        -- LG Monitore
        INSERT INTO "HS_MOD" ("HSID", "ModID", "HWID")
        SELECT 
            hs."HSID",
            mod."ModID",
            hw."HWID"
        FROM "HS" hs
        CROSS JOIN "MOD" mod
        LEFT JOIN "HW" hw ON hw."HWName" = 'Monitor'
        WHERE hs."HSName" ILIKE '%LG%'
        AND mod."ModName" ILIKE '%UltraGear%' OR mod."ModName" ILIKE '%UltraWide%' OR mod."ModName" ILIKE '%Monitor%'
        ON CONFLICT ("HSID", "ModID") DO NOTHING;

        -- BenQ Monitore
        INSERT INTO "HS_MOD" ("HSID", "ModID", "HWID")
        SELECT 
            hs."HSID",
            mod."ModID",
            hw."HWID"
        FROM "HS" hs
        CROSS JOIN "MOD" mod
        LEFT JOIN "HW" hw ON hw."HWName" = 'Monitor'
        WHERE hs."HSName" ILIKE '%BenQ%'
        AND (mod."ModName" ILIKE '%Monitor%' OR mod."ModName" ILIKE '%BenQ%')
        ON CONFLICT ("HSID", "ModID") DO NOTHING;

        -- Allgemeine Zuordnungen ohne Hardware-Typ (für Büroinventar)
        -- Büromöbel-Hersteller mit ihren Modellen
        INSERT INTO "HS_MOD" ("HSID", "ModID", "HWID")
        SELECT 
            hs."HSID",
            mod."ModID",
            NULL  -- Kein Hardware-Typ für Büromöbel
        FROM "HS" hs
        CROSS JOIN "MOD" mod
        WHERE (
            hs."HSName" ILIKE '%IKEA%' OR
            hs."HSName" ILIKE '%Steelcase%' OR
            hs."HSName" ILIKE '%Herman Miller%' OR
            hs."HSName" ILIKE '%Haworth%'
        )
        AND (
            mod."ModName" ILIKE '%Schreibtisch%' OR
            mod."ModName" ILIKE '%Stuhl%' OR
            mod."ModName" ILIKE '%Regal%' OR
            mod."ModName" ILIKE '%Schrank%' OR
            mod."ModName" ILIKE '%Tisch%'
        )
        ON CONFLICT ("HSID", "ModID") DO NOTHING;

        RAISE NOTICE 'Hersteller-Modell-Zuordnungen wurden erfolgreich angelegt.';
    ELSE
        RAISE NOTICE 'Zuordnungen existieren bereits. Überspringe Initialisierung.';
    END IF;
END $$;

-- Statistik anzeigen
SELECT 
    COUNT(*) as "Anzahl_Zuordnungen",
    COUNT(DISTINCT "HSID") as "Anzahl_Hersteller",
    COUNT(DISTINCT "ModID") as "Anzahl_Modelle",
    COUNT(CASE WHEN "HWID" IS NOT NULL THEN 1 END) as "Mit_Hardware_Typ",
    COUNT(CASE WHEN "HWID" IS NULL THEN 1 END) as "Ohne_Hardware_Typ"
FROM "HS_MOD";
