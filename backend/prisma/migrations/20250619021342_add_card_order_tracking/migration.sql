/*
  Warnings:

  - You are about to drop the column `location` on the `Player` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "CardOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "cardOrder" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "isRevealed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CardOrder_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nickname" TEXT NOT NULL,
    "chips" INTEGER NOT NULL,
    "table" INTEGER,
    "seat" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT,
    CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Player" ("chips", "createdAt", "id", "nickname", "updatedAt", "userId") SELECT "chips", "createdAt", "id", "nickname", "updatedAt", "userId" FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
CREATE UNIQUE INDEX "Player_userId_key" ON "Player"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CardOrder_gameId_key" ON "CardOrder"("gameId");
