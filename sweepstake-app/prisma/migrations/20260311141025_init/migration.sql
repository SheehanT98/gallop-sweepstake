-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Sweepstake" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "eventDate" DATETIME NOT NULL,
    "entryDeadline" DATETIME NOT NULL,
    "maxParticipants" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "pointsFirst" INTEGER NOT NULL DEFAULT 10,
    "pointsSecond" INTEGER NOT NULL DEFAULT 5,
    "pointsThird" INTEGER NOT NULL DEFAULT 2,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Horse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sweepstakeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isNonRunner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Horse_sweepstakeId_fkey" FOREIGN KEY ("sweepstakeId") REFERENCES "Sweepstake" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Entry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sweepstakeId" TEXT NOT NULL,
    "participantName" TEXT NOT NULL,
    "participantEmail" TEXT,
    "horseId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Entry_sweepstakeId_fkey" FOREIGN KEY ("sweepstakeId") REFERENCES "Sweepstake" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Entry_horseId_fkey" FOREIGN KEY ("horseId") REFERENCES "Horse" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RaceResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sweepstakeId" TEXT NOT NULL,
    "horseId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RaceResult_sweepstakeId_fkey" FOREIGN KEY ("sweepstakeId") REFERENCES "Sweepstake" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RaceResult_horseId_fkey" FOREIGN KEY ("horseId") REFERENCES "Horse" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Entry_horseId_key" ON "Entry"("horseId");

-- CreateIndex
CREATE UNIQUE INDEX "RaceResult_horseId_key" ON "RaceResult"("horseId");
