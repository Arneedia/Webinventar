-- Kategorien
INSERT INTO "BueroKategorie" ("Name", "Beschreibung") VALUES
('Schreibtische', 'Höhenverstellbare und normale Schreibtische'),
('Bürostühle', 'Ergonomische Bürostühle und Drehstühle'),
('Schränke', 'Aktenschränke, Rollcontainer und Regale'),
('Beleuchtung', 'Schreibtischlampen und Stehleuchten'),
('Besprechungstische', 'Konferenztische und Besprechungsmöbel')
ON CONFLICT ("Name") DO NOTHING;

-- Inventar (Schreibtische)
INSERT INTO "BueroInventar" ("KategorieID", "Bezeichnung", "Beschreibung", "InventarNr", "Seriennummer", "Hersteller", "Modell", "Anschaffungsdatum", "Anschaffungspreis", "Zustand", "Notiz", "createdAt", "updatedAt")
SELECT 
  (SELECT "ID" FROM "BueroKategorie" WHERE "Name" = 'Schreibtische'),
  'Höhenverstellbarer Schreibtisch',
  'Elektrisch höhenverstellbar, 160x80cm',
  'DESK-001',
  'HV-2024-001',
  'Ikea',
  'BEKANT',
  '2024-01-15'::timestamp,
  449.00,
  'GUT',
  'Elektrische Höhenverstellung funktioniert einwandfrei',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "BueroInventar" WHERE "InventarNr" = 'DESK-001');

INSERT INTO "BueroInventar" ("KategorieID", "Bezeichnung", "Hersteller", "Modell", "InventarNr", "Anschaffungsdatum", "Anschaffungspreis", "Zustand", "createdAt", "updatedAt")
SELECT 
  (SELECT "ID" FROM "BueroKategorie" WHERE "Name" = 'Schreibtische'),
  'Schreibtisch Standard',
  'Ikea',
  'LINNMON',
  'DESK-002',
  '2023-06-10'::timestamp,
  89.99,
  'GUT',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "BueroInventar" WHERE "InventarNr" = 'DESK-002');

INSERT INTO "BueroInventar" ("KategorieID", "Bezeichnung", "Beschreibung", "Hersteller", "Modell", "InventarNr", "Anschaffungsdatum", "Anschaffungspreis", "Zustand", "createdAt", "updatedAt")
SELECT 
  (SELECT "ID" FROM "BueroKategorie" WHERE "Name" = 'Schreibtische'),
  'Eckschreibtisch',
  'L-Form, 180x160cm',
  'Hammerbacher',
  'XE19',
  'DESK-003',
  '2024-03-20'::timestamp,
  329.00,
  'GUT',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "BueroInventar" WHERE "InventarNr" = 'DESK-003');

-- Inventar (Bürostühle)
INSERT INTO "BueroInventar" ("KategorieID", "Bezeichnung", "Beschreibung", "InventarNr", "Seriennummer", "Hersteller", "Modell", "Anschaffungsdatum", "Anschaffungspreis", "Zustand", "Notiz", "createdAt", "updatedAt")
SELECT 
  (SELECT "ID" FROM "BueroKategorie" WHERE "Name" = 'Bürostühle'),
  'Ergonomischer Bürostuhl',
  'Mit Lordosenstütze und Armlehnen',
  'CHAIR-001',
  'ERG-2024-045',
  'Steelcase',
  'Gesture',
  '2024-02-01'::timestamp,
  899.00,
  'GUT',
  'Premium-Modell für Geschäftsführung',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "BueroInventar" WHERE "InventarNr" = 'CHAIR-001');

INSERT INTO "BueroInventar" ("KategorieID", "Bezeichnung", "Hersteller", "Modell", "InventarNr", "Anschaffungsdatum", "Anschaffungspreis", "Zustand", "createdAt", "updatedAt")
SELECT 
  (SELECT "ID" FROM "BueroKategorie" WHERE "Name" = 'Bürostühle'),
  'Bürostuhl Standard',
  'Topstar',
  'Open Point SY',
  'CHAIR-002',
  '2023-09-15'::timestamp,
  149.99,
  'GUT',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "BueroInventar" WHERE "InventarNr" = 'CHAIR-002');

INSERT INTO "BueroInventar" ("KategorieID", "Bezeichnung", "Hersteller", "Modell", "InventarNr", "Anschaffungsdatum", "Anschaffungspreis", "Zustand", "Notiz", "createdAt", "updatedAt")
SELECT 
  (SELECT "ID" FROM "BueroKategorie" WHERE "Name" = 'Bürostühle'),
  'Bürostuhl Standard',
  'Topstar',
  'Open Point SY',
  'CHAIR-003',
  '2023-09-15'::timestamp,
  149.99,
  'BESCHAEDIGT',
  'Armlehne rechts gebrochen, Reparatur geplant',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "BueroInventar" WHERE "InventarNr" = 'CHAIR-003');

-- Inventar (Schränke)
INSERT INTO "BueroInventar" ("KategorieID", "Bezeichnung", "Beschreibung", "Hersteller", "Modell", "InventarNr", "Anschaffungsdatum", "Anschaffungspreis", "Zustand", "createdAt", "updatedAt")
SELECT 
  (SELECT "ID" FROM "BueroKategorie" WHERE "Name" = 'Schränke'),
  'Aktenschrank',
  '4 Schubladen, abschließbar',
  'Bisley',
  'F Series',
  'CAB-001',
  '2023-11-20'::timestamp,
  389.00,
  'GUT',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "BueroInventar" WHERE "InventarNr" = 'CAB-001');

INSERT INTO "BueroInventar" ("KategorieID", "Bezeichnung", "Beschreibung", "Hersteller", "Modell", "InventarNr", "Anschaffungsdatum", "Anschaffungspreis", "Zustand", "createdAt", "updatedAt")
SELECT 
  (SELECT "ID" FROM "BueroKategorie" WHERE "Name" = 'Schränke'),
  'Rollcontainer',
  '3 Schubladen, mobil',
  'Ikea',
  'HELMER',
  'CAB-002',
  '2024-01-10'::timestamp,
  59.99,
  'GUT',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "BueroInventar" WHERE "InventarNr" = 'CAB-002');

INSERT INTO "BueroInventar" ("KategorieID", "Bezeichnung", "Beschreibung", "Hersteller", "Modell", "InventarNr", "Anschaffungsdatum", "Anschaffungspreis", "Zustand", "createdAt", "updatedAt")
SELECT 
  (SELECT "ID" FROM "BueroKategorie" WHERE "Name" = 'Schränke'),
  'Bücherregal',
  '5 Fächer, 80x200cm',
  'Ikea',
  'BILLY',
  'CAB-003',
  '2023-07-05'::timestamp,
  79.99,
  'GUT',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "BueroInventar" WHERE "InventarNr" = 'CAB-003');

-- Inventar (Beleuchtung)
INSERT INTO "BueroInventar" ("KategorieID", "Bezeichnung", "Beschreibung", "Hersteller", "Modell", "InventarNr", "Anschaffungsdatum", "Anschaffungspreis", "Zustand", "createdAt", "updatedAt")
SELECT 
  (SELECT "ID" FROM "BueroKategorie" WHERE "Name" = 'Beleuchtung'),
  'LED Schreibtischlampe',
  'Dimmbar, Farbtemperatur einstellbar',
  'BenQ',
  'ScreenBar Plus',
  'LAMP-001',
  '2024-02-15'::timestamp,
  139.00,
  'GUT',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "BueroInventar" WHERE "InventarNr" = 'LAMP-001');

INSERT INTO "BueroInventar" ("KategorieID", "Bezeichnung", "Beschreibung", "Hersteller", "Modell", "InventarNr", "Anschaffungsdatum", "Anschaffungspreis", "Zustand", "createdAt", "updatedAt")
SELECT 
  (SELECT "ID" FROM "BueroKategorie" WHERE "Name" = 'Beleuchtung'),
  'Stehleuchte',
  'LED, höhenverstellbar',
  'Philips',
  'myLiving',
  'LAMP-002',
  '2023-10-01'::timestamp,
  89.99,
  'GUT',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "BueroInventar" WHERE "InventarNr" = 'LAMP-002');

-- Inventar (Besprechungstische)
INSERT INTO "BueroInventar" ("KategorieID", "Bezeichnung", "Beschreibung", "Hersteller", "Modell", "InventarNr", "Anschaffungsdatum", "Anschaffungspreis", "Zustand", "createdAt", "updatedAt")
SELECT 
  (SELECT "ID" FROM "BueroKategorie" WHERE "Name" = 'Besprechungstische'),
  'Konferenztisch',
  'Für 8 Personen, 240x120cm',
  'Hammerbacher',
  'KT24',
  'MEET-001',
  '2023-12-01'::timestamp,
  599.00,
  'GUT',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "BueroInventar" WHERE "InventarNr" = 'MEET-001');

INSERT INTO "BueroInventar" ("KategorieID", "Bezeichnung", "Beschreibung", "Hersteller", "Modell", "InventarNr", "Anschaffungsdatum", "Anschaffungspreis", "Zustand", "createdAt", "updatedAt")
SELECT 
  (SELECT "ID" FROM "BueroKategorie" WHERE "Name" = 'Besprechungstische'),
  'Stehtisch Besprechung',
  'Höhe 110cm, 120x80cm',
  'Ikea',
  'UTBY',
  'MEET-002',
  '2024-01-20'::timestamp,
  199.00,
  'GUT',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "BueroInventar" WHERE "InventarNr" = 'MEET-002');
