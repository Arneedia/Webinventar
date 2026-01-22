-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "ABT" (
    "ABTID" SERIAL NOT NULL,
    "ABTName" TEXT,

    CONSTRAINT "ABT_pkey" PRIMARY KEY ("ABTID")
);

-- CreateTable
CREATE TABLE "STAT" (
    "StatusID" SERIAL NOT NULL,
    "StatusName" TEXT,

    CONSTRAINT "STAT_pkey" PRIMARY KEY ("StatusID")
);

-- CreateTable
CREATE TABLE "GS" (
    "GSID" SERIAL NOT NULL,
    "GSName" TEXT,
    "GSStrasse" TEXT,
    "GSHausNr" TEXT,
    "GSPLZ" TEXT,
    "GSOrt" TEXT,

    CONSTRAINT "GS_pkey" PRIMARY KEY ("GSID")
);

-- CreateTable
CREATE TABLE "HW" (
    "HWID" SERIAL NOT NULL,
    "HWName" TEXT,
    "HWCode" TEXT NOT NULL,

    CONSTRAINT "HW_pkey" PRIMARY KEY ("HWID")
);

-- CreateTable
CREATE TABLE "HS" (
    "HSID" SERIAL NOT NULL,
    "HSName" TEXT,

    CONSTRAINT "HS_pkey" PRIMARY KEY ("HSID")
);

-- CreateTable
CREATE TABLE "MOD" (
    "ModID" SERIAL NOT NULL,
    "ModName" TEXT,
    "ModellNummer" TEXT,

    CONSTRAINT "MOD_pkey" PRIMARY KEY ("ModID")
);

-- CreateTable
CREATE TABLE "Benutzer" (
    "BenutzerID" SERIAL NOT NULL,
    "BenutzerName" TEXT,
    "BenutzerRaum" TEXT,
    "RaumID" INTEGER,
    "ABTID" INTEGER,
    "StatusID" INTEGER,
    "GSID" INTEGER,

    CONSTRAINT "Benutzer_pkey" PRIMARY KEY ("BenutzerID")
);

-- CreateTable
CREATE TABLE "RAUM" (
    "RaumID" SERIAL NOT NULL,
    "RaumName" TEXT,
    "Standort" TEXT,
    "Notiz" TEXT,
    "GSID" INTEGER,

    CONSTRAINT "RAUM_pkey" PRIMARY KEY ("RaumID")
);

-- CreateTable
CREATE TABLE "GER" (
    "GerID" SERIAL NOT NULL,
    "HWID" INTEGER NOT NULL,
    "HSID" INTEGER NOT NULL,
    "MODID" INTEGER NOT NULL,
    "StandardRaumID" INTEGER,
    "SNO" TEXT NOT NULL,
    "InventarCode" TEXT NOT NULL,
    "Preis" DECIMAL(65,30),
    "Zugang" TIMESTAMP(3) NOT NULL,
    "Abgang" TIMESTAMP(3),
    "EAN" TEXT,
    "IMEI1" TEXT,
    "IMEI2" TEXT,

    CONSTRAINT "GER_pkey" PRIMARY KEY ("GerID")
);

-- CreateTable
CREATE TABLE "BenutzerGER" (
    "ID" SERIAL NOT NULL,
    "BenutzerID" INTEGER NOT NULL,
    "GERID" INTEGER NOT NULL,
    "Start" TIMESTAMP(3) NOT NULL,
    "Ende" TIMESTAMP(3),

    CONSTRAINT "BenutzerGER_pkey" PRIMARY KEY ("ID")
);

-- CreateTable
CREATE TABLE "ZT" (
    "ID" SERIAL NOT NULL,
    "ZTName" TEXT NOT NULL,

    CONSTRAINT "ZT_pkey" PRIMARY KEY ("ID")
);

-- CreateTable
CREATE TABLE "Zubehör" (
    "ZubehoerID" SERIAL NOT NULL,
    "ZTID" INTEGER NOT NULL,
    "HWID" INTEGER NOT NULL,
    "ModID" INTEGER,
    "HSID" INTEGER,
    "Beschreibung" TEXT,

    CONSTRAINT "Zubehör_pkey" PRIMARY KEY ("ZubehoerID")
);

-- CreateTable
CREATE TABLE "ZubehörBenutzer" (
    "ID" SERIAL NOT NULL,
    "BenutzerID" INTEGER,
    "ZubehoerID" INTEGER NOT NULL,
    "GerID" INTEGER,
    "Start" TIMESTAMP(3) NOT NULL,
    "Ende" TIMESTAMP(3),

    CONSTRAINT "ZubehörBenutzer_pkey" PRIMARY KEY ("ID")
);

-- CreateTable
CREATE TABLE "ZubehörInventar" (
    "InventarID" SERIAL NOT NULL,
    "ZubehoerID" INTEGER NOT NULL,
    "Menge" INTEGER NOT NULL,
    "Zugang" TIMESTAMP(3) NOT NULL,
    "Abgang" TIMESTAMP(3),

    CONSTRAINT "ZubehörInventar_pkey" PRIMARY KEY ("InventarID")
);

-- CreateTable
CREATE TABLE "ZubehörBewegung" (
    "ID" SERIAL NOT NULL,
    "ZubehoerID" INTEGER NOT NULL,
    "Typ" TEXT NOT NULL,
    "Menge" INTEGER NOT NULL DEFAULT 1,
    "GerID" INTEGER,
    "BenutzerID" INTEGER,
    "Bemerkung" TEXT,
    "Zeitpunkt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZubehörBewegung_pkey" PRIMARY KEY ("ID")
);

-- CreateTable
CREATE TABLE "HW_HS" (
    "HWID" INTEGER NOT NULL,
    "HSID" INTEGER NOT NULL,

    CONSTRAINT "HW_HS_pkey" PRIMARY KEY ("HWID","HSID")
);

-- CreateTable
CREATE TABLE "HS_MOD" (
    "HSID" INTEGER NOT NULL,
    "ModID" INTEGER NOT NULL,
    "HWID" INTEGER,

    CONSTRAINT "HS_MOD_pkey" PRIMARY KEY ("HSID","ModID")
);

-- CreateTable
CREATE TABLE "WebUser" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionGroup" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermissionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebUserPermissionGroup" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "permissionGroupId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebUserPermissionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UebergabeProtokoll" (
    "ID" SERIAL NOT NULL,
    "ProtokollNr" TEXT NOT NULL,
    "Typ" TEXT NOT NULL,
    "BenutzerID" INTEGER NOT NULL,
    "ErstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ErstelltVon" INTEGER NOT NULL,
    "UnterschriftMitarbeiter" TEXT,
    "UnterschriftIT" TEXT,
    "UnterschriftDatum" TIMESTAMP(3),
    "Status" TEXT NOT NULL DEFAULT 'ENTWURF',
    "Bemerkung" TEXT,

    CONSTRAINT "UebergabeProtokoll_pkey" PRIMARY KEY ("ID")
);

-- CreateTable
CREATE TABLE "UebergabePosition" (
    "ID" SERIAL NOT NULL,
    "ProtokollID" INTEGER NOT NULL,
    "GerID" INTEGER,
    "ZubehoerID" INTEGER,
    "Zustand" TEXT NOT NULL DEFAULT 'GUT',
    "ZustandNotiz" TEXT,
    "Vollstaendig" BOOLEAN NOT NULL DEFAULT true,
    "FehlendTeile" TEXT,

    CONSTRAINT "UebergabePosition_pkey" PRIMARY KEY ("ID")
);

-- CreateTable
CREATE TABLE "UebergabeAufgabe" (
    "ID" SERIAL NOT NULL,
    "ProtokollID" INTEGER NOT NULL,
    "Titel" TEXT NOT NULL,
    "Beschreibung" TEXT,
    "FaelligAm" TIMESTAMP(3),
    "Status" TEXT NOT NULL DEFAULT 'OFFEN',
    "ErstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ErledigtAm" TIMESTAMP(3),
    "AssignedBenutzerID" INTEGER,
    "AssignedAbteilungID" INTEGER,

    CONSTRAINT "UebergabeAufgabe_pkey" PRIMARY KEY ("ID")
);

-- CreateTable
CREATE TABLE "UebergabeAufgabeVorlage" (
    "ID" SERIAL NOT NULL,
    "Typ" TEXT NOT NULL,
    "Titel" TEXT NOT NULL,
    "Beschreibung" TEXT,
    "FaelligInTagen" INTEGER,
    "Sortierung" INTEGER NOT NULL DEFAULT 0,
    "Aktiv" BOOLEAN NOT NULL DEFAULT true,
    "ErstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "AktualisiertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UebergabeAufgabeVorlage_pkey" PRIMARY KEY ("ID")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "definition" JSONB NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportExport" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "format" TEXT NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gefahrenstelle" (
    "GefahrenstelleID" SERIAL NOT NULL,
    "Name" TEXT NOT NULL,
    "Beschreibung" TEXT,

    CONSTRAINT "Gefahrenstelle_pkey" PRIMARY KEY ("GefahrenstelleID")
);

-- CreateTable
CREATE TABLE "RaumGefahrenstelle" (
    "ID" SERIAL NOT NULL,
    "RaumID" INTEGER NOT NULL,
    "GefahrenstelleID" INTEGER NOT NULL,
    "Notiz" TEXT,

    CONSTRAINT "RaumGefahrenstelle_pkey" PRIMARY KEY ("ID")
);

-- CreateIndex
CREATE UNIQUE INDEX "HW_HWCode_key" ON "HW"("HWCode");

-- CreateIndex
CREATE UNIQUE INDEX "GER_InventarCode_key" ON "GER"("InventarCode");

-- CreateIndex
CREATE UNIQUE INDEX "WebUser_email_key" ON "WebUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PermissionGroup_name_key" ON "PermissionGroup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "WebUserPermissionGroup_userId_permissionGroupId_key" ON "WebUserPermissionGroup"("userId", "permissionGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "UebergabeProtokoll_ProtokollNr_key" ON "UebergabeProtokoll"("ProtokollNr");

-- CreateIndex
CREATE INDEX "UebergabeAufgabeVorlage_Typ_Sortierung_idx" ON "UebergabeAufgabeVorlage"("Typ", "Sortierung");

-- CreateIndex
CREATE INDEX "ReportExport_reportId_createdAt_idx" ON "ReportExport"("reportId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RaumGefahrenstelle_RaumID_GefahrenstelleID_key" ON "RaumGefahrenstelle"("RaumID", "GefahrenstelleID");

-- AddForeignKey
ALTER TABLE "Benutzer" ADD CONSTRAINT "Benutzer_ABTID_fkey" FOREIGN KEY ("ABTID") REFERENCES "ABT"("ABTID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Benutzer" ADD CONSTRAINT "Benutzer_StatusID_fkey" FOREIGN KEY ("StatusID") REFERENCES "STAT"("StatusID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Benutzer" ADD CONSTRAINT "Benutzer_GSID_fkey" FOREIGN KEY ("GSID") REFERENCES "GS"("GSID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Benutzer" ADD CONSTRAINT "Benutzer_RaumID_fkey" FOREIGN KEY ("RaumID") REFERENCES "RAUM"("RaumID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RAUM" ADD CONSTRAINT "RAUM_GSID_fkey" FOREIGN KEY ("GSID") REFERENCES "GS"("GSID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GER" ADD CONSTRAINT "GER_HWID_fkey" FOREIGN KEY ("HWID") REFERENCES "HW"("HWID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GER" ADD CONSTRAINT "GER_HSID_fkey" FOREIGN KEY ("HSID") REFERENCES "HS"("HSID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GER" ADD CONSTRAINT "GER_MODID_fkey" FOREIGN KEY ("MODID") REFERENCES "MOD"("ModID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GER" ADD CONSTRAINT "GER_StandardRaumID_fkey" FOREIGN KEY ("StandardRaumID") REFERENCES "RAUM"("RaumID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenutzerGER" ADD CONSTRAINT "BenutzerGER_BenutzerID_fkey" FOREIGN KEY ("BenutzerID") REFERENCES "Benutzer"("BenutzerID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenutzerGER" ADD CONSTRAINT "BenutzerGER_GERID_fkey" FOREIGN KEY ("GERID") REFERENCES "GER"("GerID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zubehör" ADD CONSTRAINT "Zubehör_ZTID_fkey" FOREIGN KEY ("ZTID") REFERENCES "ZT"("ID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zubehör" ADD CONSTRAINT "Zubehör_HWID_fkey" FOREIGN KEY ("HWID") REFERENCES "HW"("HWID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zubehör" ADD CONSTRAINT "Zubehör_ModID_fkey" FOREIGN KEY ("ModID") REFERENCES "MOD"("ModID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zubehör" ADD CONSTRAINT "Zubehör_HSID_fkey" FOREIGN KEY ("HSID") REFERENCES "HS"("HSID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZubehörBenutzer" ADD CONSTRAINT "ZubehörBenutzer_BenutzerID_fkey" FOREIGN KEY ("BenutzerID") REFERENCES "Benutzer"("BenutzerID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZubehörBenutzer" ADD CONSTRAINT "ZubehörBenutzer_ZubehoerID_fkey" FOREIGN KEY ("ZubehoerID") REFERENCES "Zubehör"("ZubehoerID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZubehörBenutzer" ADD CONSTRAINT "ZubehörBenutzer_GerID_fkey" FOREIGN KEY ("GerID") REFERENCES "GER"("GerID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZubehörInventar" ADD CONSTRAINT "ZubehörInventar_ZubehoerID_fkey" FOREIGN KEY ("ZubehoerID") REFERENCES "Zubehör"("ZubehoerID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZubehörBewegung" ADD CONSTRAINT "ZubehörBewegung_ZubehoerID_fkey" FOREIGN KEY ("ZubehoerID") REFERENCES "Zubehör"("ZubehoerID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZubehörBewegung" ADD CONSTRAINT "ZubehörBewegung_GerID_fkey" FOREIGN KEY ("GerID") REFERENCES "GER"("GerID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZubehörBewegung" ADD CONSTRAINT "ZubehörBewegung_BenutzerID_fkey" FOREIGN KEY ("BenutzerID") REFERENCES "Benutzer"("BenutzerID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HW_HS" ADD CONSTRAINT "HW_HS_HWID_fkey" FOREIGN KEY ("HWID") REFERENCES "HW"("HWID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HW_HS" ADD CONSTRAINT "HW_HS_HSID_fkey" FOREIGN KEY ("HSID") REFERENCES "HS"("HSID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HS_MOD" ADD CONSTRAINT "HS_MOD_HSID_fkey" FOREIGN KEY ("HSID") REFERENCES "HS"("HSID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HS_MOD" ADD CONSTRAINT "HS_MOD_ModID_fkey" FOREIGN KEY ("ModID") REFERENCES "MOD"("ModID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HS_MOD" ADD CONSTRAINT "HS_MOD_HWID_fkey" FOREIGN KEY ("HWID") REFERENCES "HW"("HWID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebUserPermissionGroup" ADD CONSTRAINT "WebUserPermissionGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "WebUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebUserPermissionGroup" ADD CONSTRAINT "WebUserPermissionGroup_permissionGroupId_fkey" FOREIGN KEY ("permissionGroupId") REFERENCES "PermissionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "WebUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UebergabeProtokoll" ADD CONSTRAINT "UebergabeProtokoll_BenutzerID_fkey" FOREIGN KEY ("BenutzerID") REFERENCES "Benutzer"("BenutzerID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UebergabeProtokoll" ADD CONSTRAINT "UebergabeProtokoll_ErstelltVon_fkey" FOREIGN KEY ("ErstelltVon") REFERENCES "WebUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UebergabePosition" ADD CONSTRAINT "UebergabePosition_ProtokollID_fkey" FOREIGN KEY ("ProtokollID") REFERENCES "UebergabeProtokoll"("ID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UebergabePosition" ADD CONSTRAINT "UebergabePosition_GerID_fkey" FOREIGN KEY ("GerID") REFERENCES "GER"("GerID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UebergabePosition" ADD CONSTRAINT "UebergabePosition_ZubehoerID_fkey" FOREIGN KEY ("ZubehoerID") REFERENCES "Zubehör"("ZubehoerID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UebergabeAufgabe" ADD CONSTRAINT "UebergabeAufgabe_ProtokollID_fkey" FOREIGN KEY ("ProtokollID") REFERENCES "UebergabeProtokoll"("ID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UebergabeAufgabe" ADD CONSTRAINT "UebergabeAufgabe_AssignedBenutzerID_fkey" FOREIGN KEY ("AssignedBenutzerID") REFERENCES "Benutzer"("BenutzerID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UebergabeAufgabe" ADD CONSTRAINT "UebergabeAufgabe_AssignedAbteilungID_fkey" FOREIGN KEY ("AssignedAbteilungID") REFERENCES "ABT"("ABTID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "WebUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportExport" ADD CONSTRAINT "ReportExport_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportExport" ADD CONSTRAINT "ReportExport_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "WebUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaumGefahrenstelle" ADD CONSTRAINT "RaumGefahrenstelle_RaumID_fkey" FOREIGN KEY ("RaumID") REFERENCES "RAUM"("RaumID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaumGefahrenstelle" ADD CONSTRAINT "RaumGefahrenstelle_GefahrenstelleID_fkey" FOREIGN KEY ("GefahrenstelleID") REFERENCES "Gefahrenstelle"("GefahrenstelleID") ON DELETE CASCADE ON UPDATE CASCADE;

