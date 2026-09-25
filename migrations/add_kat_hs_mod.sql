-- Zuordnung Büroinventar-Kategorie ↔ Hersteller-Modell
-- Datum: 2026-09-25
-- Beschreibung: Legt fest, welche Hersteller/Modelle im Büroinventar bei einer Kategorie angeboten werden.
--               Wird eine Kategorie oder eine Hersteller-Modell-Zuordnung gelöscht, verschwinden die Verknüpfungen mit.

CREATE TABLE IF NOT EXISTS "KAT_HS_MOD" (
    "KategorieID" INTEGER NOT NULL,
    "HSID" INTEGER NOT NULL,
    "ModID" INTEGER NOT NULL,

    CONSTRAINT "KAT_HS_MOD_pkey" PRIMARY KEY ("KategorieID","HSID","ModID")
);

ALTER TABLE "KAT_HS_MOD" DROP CONSTRAINT IF EXISTS "KAT_HS_MOD_KategorieID_fkey";
ALTER TABLE "KAT_HS_MOD" ADD CONSTRAINT "KAT_HS_MOD_KategorieID_fkey"
  FOREIGN KEY ("KategorieID") REFERENCES "BueroKategorie"("ID") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KAT_HS_MOD" DROP CONSTRAINT IF EXISTS "KAT_HS_MOD_HSID_ModID_fkey";
ALTER TABLE "KAT_HS_MOD" ADD CONSTRAINT "KAT_HS_MOD_HSID_ModID_fkey"
  FOREIGN KEY ("HSID", "ModID") REFERENCES "HS_MOD"("HSID", "ModID") ON DELETE CASCADE ON UPDATE CASCADE;
