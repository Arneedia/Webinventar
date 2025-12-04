-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ZubehörBenutzer" (
    "ID" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "BenutzerID" INTEGER NOT NULL,
    "ZubehoerID" INTEGER NOT NULL,
    "GerID" INTEGER,
    "Start" DATETIME NOT NULL,
    "Ende" DATETIME,
    CONSTRAINT "ZubehörBenutzer_BenutzerID_fkey" FOREIGN KEY ("BenutzerID") REFERENCES "Benutzer" ("BenutzerID") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ZubehörBenutzer_ZubehoerID_fkey" FOREIGN KEY ("ZubehoerID") REFERENCES "Zubehör" ("ZubehoerID") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ZubehörBenutzer_GerID_fkey" FOREIGN KEY ("GerID") REFERENCES "GER" ("GerID") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ZubehörBenutzer" ("BenutzerID", "Ende", "ID", "Start", "ZubehoerID") SELECT "BenutzerID", "Ende", "ID", "Start", "ZubehoerID" FROM "ZubehörBenutzer";
DROP TABLE "ZubehörBenutzer";
ALTER TABLE "new_ZubehörBenutzer" RENAME TO "ZubehörBenutzer";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
