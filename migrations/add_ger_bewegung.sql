-- Geräte-Bewegungen: Raum/Benutzer-Verlauf wie im Büroinventar
BEGIN;

CREATE TABLE "GerBewegung" (
    "ID"             SERIAL PRIMARY KEY,
    "GerID"          INTEGER NOT NULL,
    "Typ"            TEXT NOT NULL,
    "VonBenutzerID"  INTEGER,
    "NachBenutzerID" INTEGER,
    "VonRaumID"      INTEGER,
    "NachRaumID"     INTEGER,
    "Bemerkung"      TEXT,
    "Zeitpunkt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GerBewegung_GerID_fkey"
      FOREIGN KEY ("GerID") REFERENCES "GER"("GerID") ON DELETE CASCADE,
    CONSTRAINT "GerBewegung_VonBenutzerID_fkey"
      FOREIGN KEY ("VonBenutzerID") REFERENCES "Benutzer"("BenutzerID") ON DELETE SET NULL,
    CONSTRAINT "GerBewegung_NachBenutzerID_fkey"
      FOREIGN KEY ("NachBenutzerID") REFERENCES "Benutzer"("BenutzerID") ON DELETE SET NULL
);

-- Vorbelegung: bestehende BenutzerGER-Zuordnungen als ZUWEISUNG/RUECKGABE übernehmen
INSERT INTO "GerBewegung" ("GerID", "Typ", "NachBenutzerID", "Bemerkung", "Zeitpunkt")
SELECT "GERID", 'ZUWEISUNG', "BenutzerID", 'Übernommen aus BenutzerGER', "Start"
FROM "BenutzerGER";

INSERT INTO "GerBewegung" ("GerID", "Typ", "VonBenutzerID", "Bemerkung", "Zeitpunkt")
SELECT "GERID", 'RUECKGABE', "BenutzerID", 'Übernommen aus BenutzerGER', "Ende"
FROM "BenutzerGER"
WHERE "Ende" IS NOT NULL;

COMMIT;
