// Tabellen-Konfiguration für die Inventar-Datenbank (für generische UI und API)

export type ColumnType = 'int' | 'varchar' | 'decimal' | 'date' | 'nvarchar';

export interface TableColumn {
  name: string;
  type: ColumnType;
  nullable: boolean;
  identity?: boolean;
  maxLength?: number;
  precision?: number;
  scale?: number;
}

export interface ForeignKeyConfig {
  column: string;
  refTable: string;
  relationName: string; // Name des Relation-Feldes im Prisma-Modell
  displayColumn: string;
}

export interface TableConfig {
  name: string;         // Technischer Tabellenname, wird in der API-URL verwendet
  displayName: string;  // Anzeigename in der UI
  primaryKey: string;   // Bei Composite Keys: "HWID,HSID" usw.
  model: string;        // Name der Prisma-Client-Property (z.B. 'benutzer', 'gER')
  columns: TableColumn[];
  foreignKeys?: ForeignKeyConfig[];
}

export const tables: TableConfig[] = [
  {
    name: 'ABT',
    displayName: 'Abteilungen',
    primaryKey: 'ABTID',
    model: 'aBT',
    columns: [
      { name: 'ABTID', type: 'int', nullable: false, identity: true },
      { name: 'ABTName', type: 'varchar', nullable: true, maxLength: 255 },
    ],
  },
  {
    name: 'STAT',
    displayName: 'Status',
    primaryKey: 'StatusID',
    model: 'sTAT',
    columns: [
      { name: 'StatusID', type: 'int', nullable: false, identity: true },
      { name: 'StatusName', type: 'varchar', nullable: true, maxLength: 255 },
    ],
  },
  {
    name: 'GS',
    displayName: 'Geschäftsstellen',
    primaryKey: 'GSID',
    model: 'gS',
    columns: [
      { name: 'GSID', type: 'int', nullable: false, identity: true },
      { name: 'GSName', type: 'varchar', nullable: true, maxLength: 255 },
      { name: 'GSStrasse', type: 'varchar', nullable: true, maxLength: 255 },
      { name: 'GSHausNr', type: 'varchar', nullable: true, maxLength: 10 },
      { name: 'GSPLZ', type: 'varchar', nullable: true, maxLength: 5 },
      { name: 'GSOrt', type: 'varchar', nullable: true, maxLength: 255 },
    ],
  },
  {
    name: 'HW',
    displayName: 'Hardware-Typen',
    primaryKey: 'HWID',
    model: 'hW',
    columns: [
      { name: 'HWID', type: 'int', nullable: false, identity: true },
      { name: 'HWName', type: 'varchar', nullable: true, maxLength: 255 },
      { name: 'HWCode', type: 'varchar', nullable: false, maxLength: 10 },
    ],
  },
  {
    name: 'HS',
    displayName: 'Hersteller',
    primaryKey: 'HSID',
    model: 'hS',
    columns: [
      { name: 'HSID', type: 'int', nullable: false, identity: true },
      { name: 'HSName', type: 'varchar', nullable: true, maxLength: 255 },
    ],
  },
  {
    name: 'MOD',
    displayName: 'Modelle',
    primaryKey: 'ModID',
    model: 'mOD',
    columns: [
      { name: 'ModID', type: 'int', nullable: false, identity: true },
      { name: 'ModName', type: 'varchar', nullable: true, maxLength: 255 },
      { name: 'ModellNummer', type: 'varchar', nullable: true, maxLength: 50 },
    ],
  },
  {
    name: 'Benutzer',
    displayName: 'Benutzer',
    primaryKey: 'BenutzerID',
    model: 'benutzer',
    columns: [
      { name: 'BenutzerID', type: 'int', nullable: false, identity: true },
      { name: 'BenutzerName', type: 'varchar', nullable: true, maxLength: 255 },
      { name: 'BenutzerRaum', type: 'varchar', nullable: true, maxLength: 50 },
      { name: 'ABTID', type: 'int', nullable: true },
      { name: 'StatusID', type: 'int', nullable: true },
      { name: 'GSID', type: 'int', nullable: true },
    ],
    foreignKeys: [
      { column: 'ABTID', refTable: 'ABT', relationName: 'ABT', displayColumn: 'ABTName' },
      { column: 'StatusID', refTable: 'STAT', relationName: 'STAT', displayColumn: 'StatusName' },
      { column: 'GSID', refTable: 'GS', relationName: 'GS', displayColumn: 'GSName' },
    ],
  },
  {
    name: 'RAUM',
    displayName: 'Räume',
    primaryKey: 'RaumID',
    model: 'rAUM',
    columns: [
      { name: 'RaumID', type: 'int', nullable: false, identity: true },
      { name: 'RaumName', type: 'varchar', nullable: true, maxLength: 255 },
      { name: 'Standort', type: 'varchar', nullable: true, maxLength: 255 },
      { name: 'Notiz', type: 'nvarchar', nullable: true, maxLength: 1000 },
    ],
  },
  {
    name: 'GER',
    displayName: 'Geräte',
    primaryKey: 'GerID',
    model: 'gER',
    columns: [
      { name: 'GerID', type: 'int', nullable: false, identity: true },
      { name: 'HWID', type: 'int', nullable: false },
      { name: 'HSID', type: 'int', nullable: false },
      { name: 'MODID', type: 'int', nullable: false },
      { name: 'StandardRaumID', type: 'int', nullable: true },
      { name: 'SNO', type: 'varchar', nullable: false, maxLength: 50 },
      { name: 'InventarCode', type: 'varchar', nullable: false, maxLength: 20 },
      { name: 'Preis', type: 'decimal', nullable: true, precision: 18, scale: 2 },
      { name: 'Zugang', type: 'date', nullable: false },
      { name: 'Abgang', type: 'date', nullable: true },
      { name: 'EAN', type: 'varchar', nullable: true, maxLength: 50 },
      { name: 'IMEI1', type: 'varchar', nullable: true, maxLength: 50 },
      { name: 'IMEI2', type: 'varchar', nullable: true, maxLength: 50 },
    ],
    foreignKeys: [
      { column: 'HWID', refTable: 'HW', relationName: 'HW', displayColumn: 'HWName' },
      { column: 'HSID', refTable: 'HS', relationName: 'HS', displayColumn: 'HSName' },
      { column: 'MODID', refTable: 'MOD', relationName: 'MOD', displayColumn: 'ModName' },
      { column: 'StandardRaumID', refTable: 'RAUM', relationName: 'StandardRaum', displayColumn: 'RaumName' },
    ],
  },
  {
    name: 'BenutzerGER',
    displayName: 'Benutzer-Geräte Zuordnung',
    primaryKey: 'ID',
    model: 'benutzerGER',
    columns: [
      { name: 'ID', type: 'int', nullable: false, identity: true },
      { name: 'BenutzerID', type: 'int', nullable: false },
      { name: 'GERID', type: 'int', nullable: false },
      { name: 'Start', type: 'date', nullable: false },
      { name: 'Ende', type: 'date', nullable: true },
    ],
    foreignKeys: [
      { column: 'BenutzerID', refTable: 'Benutzer', relationName: 'Benutzer', displayColumn: 'BenutzerName' },
      { column: 'GERID', refTable: 'GER', relationName: 'GER', displayColumn: 'SNO' },
    ],
  },
  {
    name: 'ZT',
    displayName: 'Zubehör-Typen',
    primaryKey: 'ID',
    model: 'zT',
    columns: [
      { name: 'ID', type: 'int', nullable: false, identity: true },
      { name: 'ZTName', type: 'varchar', nullable: false, maxLength: 255 },
    ],
  },
  {
    name: 'Zubehoer',
    displayName: 'Zubehör',
    primaryKey: 'ZubehoerID',
    model: 'zubehoer',
    columns: [
      { name: 'ZubehoerID', type: 'int', nullable: false, identity: true },
      { name: 'ZTID', type: 'int', nullable: false },
      { name: 'HWID', type: 'int', nullable: false },
      { name: 'ModID', type: 'int', nullable: true },
      { name: 'HSID', type: 'int', nullable: true },
      { name: 'Beschreibung', type: 'nvarchar', nullable: true, maxLength: 1000 },
    ],
    foreignKeys: [
      { column: 'ZTID', refTable: 'ZT', relationName: 'ZT', displayColumn: 'ZTName' },
      { column: 'HWID', refTable: 'HW', relationName: 'HW', displayColumn: 'HWName' },
      { column: 'ModID', refTable: 'MOD', relationName: 'MOD', displayColumn: 'ModName' },
      { column: 'HSID', refTable: 'HS', relationName: 'HS', displayColumn: 'HSName' },
    ],
  },
  {
    name: 'ZubehoerBenutzer',
    displayName: 'Zubehör-Benutzer Zuordnung',
    primaryKey: 'ID',
    model: 'zubehoerBenutzer',
    columns: [
      { name: 'ID', type: 'int', nullable: false, identity: true },
      { name: 'BenutzerID', type: 'int', nullable: false },
      { name: 'ZubehoerID', type: 'int', nullable: false },
      { name: 'Start', type: 'date', nullable: false },
      { name: 'Ende', type: 'date', nullable: true },
    ],
    foreignKeys: [
      { column: 'BenutzerID', refTable: 'Benutzer', relationName: 'Benutzer', displayColumn: 'BenutzerName' },
      { column: 'ZubehoerID', refTable: 'Zubehoer', relationName: 'Zubehoer', displayColumn: 'Beschreibung' },
    ],
  },
  {
    name: 'ZubehoerInventar',
    displayName: 'Zubehör-Inventar',
    primaryKey: 'InventarID',
    model: 'zubehoerInventar',
    columns: [
      { name: 'InventarID', type: 'int', nullable: false, identity: true },
      { name: 'ZubehoerID', type: 'int', nullable: false },
      { name: 'Menge', type: 'int', nullable: false },
      { name: 'Zugang', type: 'date', nullable: false },
      { name: 'Abgang', type: 'date', nullable: true },
    ],
    foreignKeys: [
      { column: 'ZubehoerID', refTable: 'Zubehoer', relationName: 'Zubehoer', displayColumn: 'Beschreibung' },
    ],
  },
  {
    name: 'HW_HS',
    displayName: 'Hardware-Hersteller Zuordnung',
    primaryKey: 'HWID,HSID',
    model: 'hW_HS',
    columns: [
      { name: 'HWID', type: 'int', nullable: false },
      { name: 'HSID', type: 'int', nullable: false },
    ],
    foreignKeys: [
      { column: 'HWID', refTable: 'HW', relationName: 'HW', displayColumn: 'HWName' },
      { column: 'HSID', refTable: 'HS', relationName: 'HS', displayColumn: 'HSName' },
    ],
  },
  {
    name: 'HS_MOD',
    displayName: 'Hersteller-Modell Zuordnung',
    primaryKey: 'HSID,ModID',
    model: 'hS_MOD',
    columns: [
      { name: 'HSID', type: 'int', nullable: false },
      { name: 'ModID', type: 'int', nullable: false },
      { name: 'HWID', type: 'int', nullable: true },
    ],
    foreignKeys: [
      { column: 'HSID', refTable: 'HS', relationName: 'HS', displayColumn: 'HSName' },
      { column: 'ModID', refTable: 'MOD', relationName: 'MOD', displayColumn: 'ModName' },
      { column: 'HWID', refTable: 'HW', relationName: 'HW', displayColumn: 'HWName' },
    ],
  },
];

export function getTableConfig(tableName: string): TableConfig | undefined {
  return tables.find((t) => t.name.toLowerCase() === tableName.toLowerCase());
}

export function listTables(): { name: string; displayName: string; primaryKey: string }[] {
  return tables.map(({ name, displayName, primaryKey }) => ({ name, displayName, primaryKey }));
}
