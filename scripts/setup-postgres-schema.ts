/**
 * Setup Postgres Schema auf Vercel
 * 
 * Erstellt alle Tabellen in der Vercel Postgres-Datenbank
 * basierend auf dem Prisma Schema.
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const POSTGRES_URL = process.env.POSTGRES_URL;

if (!POSTGRES_URL) {
  console.error('❌ POSTGRES_URL nicht in .env gefunden!');
  process.exit(1);
}

const SCHEMA_SQL = `
-- Abteilungen
CREATE TABLE IF NOT EXISTS "ABT" (
  "ABTID" SERIAL PRIMARY KEY,
  "ABTName" TEXT
);

-- Status
CREATE TABLE IF NOT EXISTS "STAT" (
  "StatusID" SERIAL PRIMARY KEY,
  "StatusName" TEXT
);

-- Geschäftsstellen
CREATE TABLE IF NOT EXISTS "GS" (
  "GSID" SERIAL PRIMARY KEY,
  "GSName" TEXT,
  "GSStrasse" TEXT,
  "GSHausNr" TEXT,
  "GSPLZ" TEXT,
  "GSOrt" TEXT
);

-- Hardware-Typen
CREATE TABLE IF NOT EXISTS "HW" (
  "HWID" SERIAL PRIMARY KEY,
  "HWName" TEXT,
  "HWCode" TEXT UNIQUE NOT NULL
);

-- Hersteller
CREATE TABLE IF NOT EXISTS "HS" (
  "HSID" SERIAL PRIMARY KEY,
  "HSName" TEXT
);

-- Modelle
CREATE TABLE IF NOT EXISTS "MOD" (
  "ModID" SERIAL PRIMARY KEY,
  "ModName" TEXT,
  "ModellNummer" TEXT
);

-- Räume
CREATE TABLE IF NOT EXISTS "RAUM" (
  "RaumID" SERIAL PRIMARY KEY,
  "RaumName" TEXT,
  "Standort" TEXT,
  "Notiz" TEXT
);

-- Zubehör-Typen
CREATE TABLE IF NOT EXISTS "ZT" (
  "ID" SERIAL PRIMARY KEY,
  "ZTName" TEXT NOT NULL
);

-- Benutzer
CREATE TABLE IF NOT EXISTS "Benutzer" (
  "BenutzerID" SERIAL PRIMARY KEY,
  "BenutzerName" TEXT,
  "BenutzerRaum" TEXT,
  "ABTID" INTEGER REFERENCES "ABT"("ABTID"),
  "StatusID" INTEGER REFERENCES "STAT"("StatusID"),
  "GSID" INTEGER REFERENCES "GS"("GSID")
);

-- Geräte
CREATE TABLE IF NOT EXISTS "GER" (
  "GerID" SERIAL PRIMARY KEY,
  "HWID" INTEGER NOT NULL REFERENCES "HW"("HWID"),
  "HSID" INTEGER NOT NULL REFERENCES "HS"("HSID"),
  "MODID" INTEGER NOT NULL REFERENCES "MOD"("ModID"),
  "RaumID" INTEGER REFERENCES "RAUM"("RaumID"),
  "SNO" TEXT NOT NULL,
  "InventarCode" TEXT UNIQUE NOT NULL,
  "Preis" DECIMAL,
  "Zugang" TIMESTAMP NOT NULL,
  "Abgang" TIMESTAMP,
  "EAN" TEXT,
  "IMEI1" TEXT,
  "IMEI2" TEXT
);

-- Hardware-Hersteller Zuordnung
CREATE TABLE IF NOT EXISTS "HW_HS" (
  "HWID" INTEGER NOT NULL REFERENCES "HW"("HWID"),
  "HSID" INTEGER NOT NULL REFERENCES "HS"("HSID"),
  PRIMARY KEY ("HWID", "HSID")
);

-- Hersteller-Modell Zuordnung
CREATE TABLE IF NOT EXISTS "HS_MOD" (
  "HSID" INTEGER NOT NULL REFERENCES "HS"("HSID"),
  "ModID" INTEGER NOT NULL REFERENCES "MOD"("ModID"),
  "HWID" INTEGER REFERENCES "HW"("HWID"),
  PRIMARY KEY ("HSID", "ModID")
);

-- Zubehör
CREATE TABLE IF NOT EXISTS "Zubehör" (
  "ZubehoerID" SERIAL PRIMARY KEY,
  "ZTID" INTEGER NOT NULL REFERENCES "ZT"("ID"),
  "HWID" INTEGER NOT NULL REFERENCES "HW"("HWID"),
  "ModID" INTEGER REFERENCES "MOD"("ModID"),
  "HSID" INTEGER REFERENCES "HS"("HSID"),
  "Beschreibung" TEXT
);

-- Benutzer-Geräte Zuordnung
CREATE TABLE IF NOT EXISTS "BenutzerGER" (
  "ID" SERIAL PRIMARY KEY,
  "BenutzerID" INTEGER NOT NULL REFERENCES "Benutzer"("BenutzerID"),
  "GERID" INTEGER NOT NULL REFERENCES "GER"("GerID"),
  "Start" TIMESTAMP NOT NULL,
  "Ende" TIMESTAMP
);

-- Zubehör-Benutzer Zuordnung
CREATE TABLE IF NOT EXISTS "ZubehörBenutzer" (
  "ID" SERIAL PRIMARY KEY,
  "BenutzerID" INTEGER REFERENCES "Benutzer"("BenutzerID"),
  "ZubehoerID" INTEGER NOT NULL REFERENCES "Zubehör"("ZubehoerID"),
  "GerID" INTEGER REFERENCES "GER"("GerID"),
  "Start" TIMESTAMP NOT NULL,
  "Ende" TIMESTAMP
);

-- Zubehör-Inventar
CREATE TABLE IF NOT EXISTS "ZubehörInventar" (
  "InventarID" SERIAL PRIMARY KEY,
  "ZubehoerID" INTEGER NOT NULL REFERENCES "Zubehör"("ZubehoerID"),
  "Menge" INTEGER NOT NULL,
  "Zugang" TIMESTAMP NOT NULL,
  "Abgang" TIMESTAMP
);

-- Zubehör-Bewegungen
CREATE TABLE IF NOT EXISTS "ZubehörBewegung" (
  "ID" SERIAL PRIMARY KEY,
  "ZubehoerID" INTEGER NOT NULL REFERENCES "Zubehör"("ZubehoerID"),
  "Typ" TEXT NOT NULL,
  "Menge" INTEGER NOT NULL DEFAULT 1,
  "GerID" INTEGER REFERENCES "GER"("GerID"),
  "BenutzerID" INTEGER REFERENCES "Benutzer"("BenutzerID"),
  "Bemerkung" TEXT,
  "Zeitpunkt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- WebUser
CREATE TABLE IF NOT EXISTS "WebUser" (
  "id" SERIAL PRIMARY KEY,
  "email" TEXT UNIQUE NOT NULL,
  "name" TEXT,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'USER',
  "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- PermissionGroup
CREATE TABLE IF NOT EXISTS "PermissionGroup" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT UNIQUE NOT NULL,
  "description" TEXT,
  "permissions" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- WebUserPermissionGroup
CREATE TABLE IF NOT EXISTS "WebUserPermissionGroup" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "WebUser"("id") ON DELETE CASCADE,
  "permissionGroupId" INTEGER NOT NULL REFERENCES "PermissionGroup"("id") ON DELETE CASCADE,
  "assignedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE ("userId", "permissionGroupId")
);

-- Session
CREATE TABLE IF NOT EXISTS "Session" (
  "id" SERIAL PRIMARY KEY,
  "token" TEXT UNIQUE NOT NULL,
  "userId" INTEGER NOT NULL REFERENCES "WebUser"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "expiresAt" TIMESTAMP NOT NULL
);

-- Übergabeprotokolle
CREATE TABLE IF NOT EXISTS "UebergabeProtokoll" (
  "ID" SERIAL PRIMARY KEY,
  "ProtokollNr" TEXT UNIQUE NOT NULL,
  "Typ" TEXT NOT NULL,
  "BenutzerID" INTEGER NOT NULL REFERENCES "Benutzer"("BenutzerID"),
  "ErstelltAm" TIMESTAMP NOT NULL DEFAULT NOW(),
  "ErstelltVon" INTEGER NOT NULL REFERENCES "WebUser"("id"),
  "UnterschriftMitarbeiter" TEXT,
  "UnterschriftIT" TEXT,
  "UnterschriftDatum" TIMESTAMP,
  "Status" TEXT NOT NULL DEFAULT 'ENTWURF',
  "Bemerkung" TEXT
);

-- Übergabe-Positionen
CREATE TABLE IF NOT EXISTS "UebergabePosition" (
  "ID" SERIAL PRIMARY KEY,
  "ProtokollID" INTEGER NOT NULL REFERENCES "UebergabeProtokoll"("ID") ON DELETE CASCADE,
  "GerID" INTEGER REFERENCES "GER"("GerID"),
  "ZubehoerID" INTEGER REFERENCES "Zubehör"("ZubehoerID"),
  "Zustand" TEXT NOT NULL DEFAULT 'GUT',
  "ZustandNotiz" TEXT,
  "Vollstaendig" BOOLEAN NOT NULL DEFAULT TRUE,
  "FehlendTeile" TEXT
);
`;

async function setupSchema() {
  console.log('🚀 Erstelle Postgres Schema auf Vercel...\n');
  
  const pg = new Client({ connectionString: POSTGRES_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  console.log('✅ Postgres verbunden\n');
  
  try {
    await pg.query(SCHEMA_SQL);
    console.log('✅ Schema erfolgreich erstellt!');
  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  } finally {
    await pg.end();
  }
}

setupSchema().catch(console.error);
