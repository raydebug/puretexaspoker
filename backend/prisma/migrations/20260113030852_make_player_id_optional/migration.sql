/*
  Warnings:

  - The primary key for the `Message` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Message` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `PlayerTable` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `PlayerTable` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `TableAction` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `TableAction` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - A unique constraint covering the columns `[nickname]` on the table `Player` will be added. If there are existing duplicate values, this will fail.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Message" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "content" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "tableId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("content", "createdAt", "id", "playerId", "tableId") SELECT "content", "createdAt", "id", "playerId", "tableId" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE TABLE "new_PlayerTable" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "playerId" TEXT NOT NULL,
    "tableId" INTEGER NOT NULL,
    "seatNumber" INTEGER NOT NULL,
    "buyIn" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlayerTable_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PlayerTable_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PlayerTable" ("buyIn", "createdAt", "id", "playerId", "seatNumber", "tableId", "updatedAt") SELECT "buyIn", "createdAt", "id", "playerId", "seatNumber", "tableId", "updatedAt" FROM "PlayerTable";
DROP TABLE "PlayerTable";
ALTER TABLE "new_PlayerTable" RENAME TO "PlayerTable";
CREATE UNIQUE INDEX "PlayerTable_tableId_seatNumber_key" ON "PlayerTable"("tableId", "seatNumber");
CREATE TABLE "new_TableAction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tableId" INTEGER NOT NULL,
    "playerId" TEXT,
    "type" TEXT NOT NULL,
    "amount" INTEGER,
    "phase" TEXT NOT NULL,
    "handNumber" INTEGER NOT NULL DEFAULT 1,
    "actionSequence" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gameStateBefore" TEXT,
    "gameStateAfter" TEXT,
    CONSTRAINT "TableAction_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TableAction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TableAction" ("actionSequence", "amount", "gameStateAfter", "gameStateBefore", "handNumber", "id", "phase", "playerId", "tableId", "timestamp", "type") SELECT "actionSequence", "amount", "gameStateAfter", "gameStateBefore", "handNumber", "id", "phase", "playerId", "tableId", "timestamp", "type" FROM "TableAction";
DROP TABLE "TableAction";
ALTER TABLE "new_TableAction" RENAME TO "TableAction";
CREATE INDEX "TableAction_tableId_handNumber_actionSequence_idx" ON "TableAction"("tableId", "handNumber", "actionSequence");
CREATE INDEX "TableAction_tableId_timestamp_idx" ON "TableAction"("tableId", "timestamp");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Player_nickname_key" ON "Player"("nickname");
