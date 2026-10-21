-- ============================================================================
-- Produktiv-Update: webinventar PostgreSQL
-- Datum: 2026-10-20
-- Zweck: Schema der Produktiv-DB an aktuelles prisma/schema.prisma angleichen
-- Garantie: KEIN Datenverlust - nur CREATE TABLE, ADD COLUMN, ADD CONSTRAINT
-- WICHTIG: Vorher Backup erstellen!
--   sudo -u postgres pg_dump -d webinventar | gzip > ~/backup_vor_update.sql.gz
-- ============================================================================

-- Alles in einer Transaktion: bei Fehler wird komplett zurueckgerollt
BEGIN;

-- ============================================================================
-- SCHRITT 1: Neue Spalten auf bestehende Tabellen
-- DEFAULT 'BEIDE' fuellt bestehende Zeilen automatisch -> kein Datenverlust
-- ============================================================================

ALTER TABLE public."HS"
    ADD COLUMN IF NOT EXISTS "Bereich" text NOT NULL DEFAULT 'BEIDE';

ALTER TABLE public."MOD"
    ADD COLUMN IF NOT EXISTS "Bereich" text NOT NULL DEFAULT 'BEIDE';

-- ============================================================================
-- SCHRITT 2 (optional): WODISNr von varchar(10) auf text angleichen
-- Verlustfrei (Widening) - Prisma erwartet "text" fuer String?
-- Kann weggelassen werden, wenn die 10-Zeichen-Limitierung gewuenscht ist.
-- ============================================================================

ALTER TABLE public."GER"
    ALTER COLUMN "WODISNr" TYPE text;

-- ============================================================================
-- SCHRITT 3: Neue Tabelle BueroKategorie
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."BueroKategorie" (
    "ID" integer NOT NULL,
    "Name" text NOT NULL,
    "Beschreibung" text
);

CREATE SEQUENCE IF NOT EXISTS public."BueroKategorie_ID_seq"
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public."BueroKategorie_ID_seq" OWNED BY public."BueroKategorie"."ID";

ALTER TABLE ONLY public."BueroKategorie"
    ALTER COLUMN "ID" SET DEFAULT nextval('public."BueroKategorie_ID_seq"'::regclass);

ALTER TABLE ONLY public."BueroKategorie"
    ADD CONSTRAINT "BueroKategorie_pkey" PRIMARY KEY ("ID");

CREATE UNIQUE INDEX IF NOT EXISTS "BueroKategorie_Name_key"
    ON public."BueroKategorie" USING btree ("Name");

-- ============================================================================
-- SCHRITT 4: Neue Tabelle BueroInventar
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."BueroInventar" (
    "ID" integer NOT NULL,
    "KategorieID" integer NOT NULL,
    "Bezeichnung" text NOT NULL,
    "Beschreibung" text,
    "InventarNr" text,
    "Seriennummer" text,
    "Hersteller" text,
    "Modell" text,
    "Anschaffungsdatum" timestamp(3) without time zone,
    "Anschaffungspreis" numeric(65,30),
    "Zustand" text,
    "RaumID" integer,
    "BenutzerID" integer,
    "Notiz" text,
    "Abgang" timestamp(3) without time zone,
    "AbgangGrund" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS public."BueroInventar_ID_seq"
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public."BueroInventar_ID_seq" OWNED BY public."BueroInventar"."ID";

ALTER TABLE ONLY public."BueroInventar"
    ALTER COLUMN "ID" SET DEFAULT nextval('public."BueroInventar_ID_seq"'::regclass);

ALTER TABLE ONLY public."BueroInventar"
    ADD CONSTRAINT "BueroInventar_pkey" PRIMARY KEY ("ID");

CREATE UNIQUE INDEX IF NOT EXISTS "BueroInventar_InventarNr_key"
    ON public."BueroInventar" USING btree ("InventarNr");

ALTER TABLE ONLY public."BueroInventar"
    ADD CONSTRAINT "BueroInventar_KategorieID_fkey"
    FOREIGN KEY ("KategorieID") REFERENCES public."BueroKategorie"("ID")
    ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."BueroInventar"
    ADD CONSTRAINT "BueroInventar_RaumID_fkey"
    FOREIGN KEY ("RaumID") REFERENCES public."RAUM"("RaumID")
    ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."BueroInventar"
    ADD CONSTRAINT "BueroInventar_BenutzerID_fkey"
    FOREIGN KEY ("BenutzerID") REFERENCES public."Benutzer"("BenutzerID")
    ON UPDATE CASCADE ON DELETE SET NULL;

-- ============================================================================
-- SCHRITT 5: Neue Tabelle GerBewegung (Geraete-Bewegungstracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."GerBewegung" (
    "ID" integer NOT NULL,
    "GerID" integer NOT NULL,
    "Typ" text NOT NULL,
    "VonBenutzerID" integer,
    "NachBenutzerID" integer,
    "VonRaumID" integer,
    "NachRaumID" integer,
    "Bemerkung" text,
    "Zeitpunkt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS public."GerBewegung_ID_seq"
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public."GerBewegung_ID_seq" OWNED BY public."GerBewegung"."ID";

ALTER TABLE ONLY public."GerBewegung"
    ALTER COLUMN "ID" SET DEFAULT nextval('public."GerBewegung_ID_seq"'::regclass);

ALTER TABLE ONLY public."GerBewegung"
    ADD CONSTRAINT "GerBewegung_pkey" PRIMARY KEY ("ID");

ALTER TABLE ONLY public."GerBewegung"
    ADD CONSTRAINT "GerBewegung_GerID_fkey"
    FOREIGN KEY ("GerID") REFERENCES public."GER"("GerID")
    ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."GerBewegung"
    ADD CONSTRAINT "GerBewegung_VonBenutzerID_fkey"
    FOREIGN KEY ("VonBenutzerID") REFERENCES public."Benutzer"("BenutzerID")
    ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."GerBewegung"
    ADD CONSTRAINT "GerBewegung_NachBenutzerID_fkey"
    FOREIGN KEY ("NachBenutzerID") REFERENCES public."Benutzer"("BenutzerID")
    ON UPDATE CASCADE ON DELETE SET NULL;

-- ============================================================================
-- SCHRITT 6: Neue Tabelle BueroBewegung (Bueroinventar-Tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."BueroBewegung" (
    "ID" integer NOT NULL,
    "InventarID" integer NOT NULL,
    "Typ" text NOT NULL,
    "VonBenutzerID" integer,
    "NachBenutzerID" integer,
    "VonRaumID" integer,
    "NachRaumID" integer,
    "Bemerkung" text,
    "Zeitpunkt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS public."BueroBewegung_ID_seq"
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public."BueroBewegung_ID_seq" OWNED BY public."BueroBewegung"."ID";

ALTER TABLE ONLY public."BueroBewegung"
    ALTER COLUMN "ID" SET DEFAULT nextval('public."BueroBewegung_ID_seq"'::regclass);

ALTER TABLE ONLY public."BueroBewegung"
    ADD CONSTRAINT "BueroBewegung_pkey" PRIMARY KEY ("ID");

ALTER TABLE ONLY public."BueroBewegung"
    ADD CONSTRAINT "BueroBewegung_InventarID_fkey"
    FOREIGN KEY ("InventarID") REFERENCES public."BueroInventar"("ID")
    ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public."BueroBewegung"
    ADD CONSTRAINT "BueroBewegung_VonBenutzerID_fkey"
    FOREIGN KEY ("VonBenutzerID") REFERENCES public."Benutzer"("BenutzerID")
    ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public."BueroBewegung"
    ADD CONSTRAINT "BueroBewegung_NachBenutzerID_fkey"
    FOREIGN KEY ("NachBenutzerID") REFERENCES public."Benutzer"("BenutzerID")
    ON UPDATE CASCADE ON DELETE SET NULL;

-- ============================================================================
-- SCHRITT 7: Neue Tabelle KAT_HS_MOD (Kategorie <-> Hersteller-Modell n:m)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."KAT_HS_MOD" (
    "KategorieID" integer NOT NULL,
    "HSID" integer NOT NULL,
    "ModID" integer NOT NULL
);

ALTER TABLE ONLY public."KAT_HS_MOD"
    ADD CONSTRAINT "KAT_HS_MOD_pkey"
    PRIMARY KEY ("KategorieID", "HSID", "ModID");

ALTER TABLE ONLY public."KAT_HS_MOD"
    ADD CONSTRAINT "KAT_HS_MOD_KategorieID_fkey"
    FOREIGN KEY ("KategorieID") REFERENCES public."BueroKategorie"("ID")
    ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public."KAT_HS_MOD"
    ADD CONSTRAINT "KAT_HS_MOD_HSID_ModID_fkey"
    FOREIGN KEY ("HSID", "ModID") REFERENCES public."HS_MOD"("HSID", "ModID")
    ON UPDATE CASCADE ON DELETE CASCADE;

-- ============================================================================
-- SCHRITT 8: Owner auf edv setzen (gleiches Rechtemuster wie Rest der DB)
-- ============================================================================

ALTER TABLE public."BueroKategorie" OWNER TO edv;
ALTER TABLE public."BueroInventar" OWNER TO edv;
ALTER TABLE public."GerBewegung" OWNER TO edv;
ALTER TABLE public."BueroBewegung" OWNER TO edv;
ALTER TABLE public."KAT_HS_MOD" OWNER TO edv;

ALTER SEQUENCE public."BueroKategorie_ID_seq" OWNER TO edv;
ALTER SEQUENCE public."BueroInventar_ID_seq" OWNER TO edv;
ALTER SEQUENCE public."GerBewegung_ID_seq" OWNER TO edv;
ALTER SEQUENCE public."BueroBewegung_ID_seq" OWNER TO edv;

COMMIT;

-- ============================================================================
-- VERIFIKATION (nach dem Update ausfuehren):
--   \dt                                    -> 5 neue Tabellen sichtbar
--   \d "BueroInventar"                     -> Spalten + FKs pruefen
--   SELECT "Bereich" FROM "HS" LIMIT 3;    -> sollte 'BEIDE' liefern
-- ============================================================================
