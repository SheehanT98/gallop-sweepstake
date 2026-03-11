/*
  Warnings:

  - Added the required column `entryToken` to the `Entry` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Entry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sweepstakeId" TEXT NOT NULL,
    "participantName" TEXT NOT NULL,
    "participantEmail" TEXT,
    "entryToken" TEXT NOT NULL,
    "horseId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Entry_sweepstakeId_fkey" FOREIGN KEY ("sweepstakeId") REFERENCES "Sweepstake" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Entry_horseId_fkey" FOREIGN KEY ("horseId") REFERENCES "Horse" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Entry" ("createdAt", "horseId", "id", "participantEmail", "participantName", "sweepstakeId") SELECT "createdAt", "horseId", "id", "participantEmail", "participantName", "sweepstakeId" FROM "Entry";
DROP TABLE "Entry";
ALTER TABLE "new_Entry" RENAME TO "Entry";
CREATE UNIQUE INDEX "Entry_entryToken_key" ON "Entry"("entryToken");
CREATE UNIQUE INDEX "Entry_horseId_key" ON "Entry"("horseId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
