/*
  Warnings:

  - You are about to drop the `CardOrder` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ConnectionLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Game` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GameAction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GameActionHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GameSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PlayerSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `gamesPlayed` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `gamesWon` on the `User` table. All the data in the column will be lost.
  - Added the required column `tableId` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "CardOrder_gameId_key";

-- DropIndex
DROP INDEX "ConnectionLog_gameId_timestamp_idx";

-- DropIndex
DROP INDEX "ConnectionLog_userId_timestamp_idx";

-- DropIndex
DROP INDEX "GameActionHistory_gameId_timestamp_idx";

-- DropIndex
DROP INDEX "GameActionHistory_gameId_handNumber_actionSequence_idx";

-- DropIndex
DROP INDEX "GameSession_gameId_key";

-- DropIndex
DROP INDEX "PlayerSession_userId_gameId_key";

-- DropIndex
DROP INDEX "PlayerSession_socketId_idx";

-- DropIndex
DROP INDEX "PlayerSession_gameId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "CardOrder";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "ConnectionLog";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Game";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "GameAction";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "GameActionHistory";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "GameSession";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PlayerSession";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "TableAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tableId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER,
    "phase" TEXT NOT NULL,
    "handNumber" INTEGER NOT NULL DEFAULT 1,
    "actionSequence" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gameStateBefore" TEXT,
    "gameStateAfter" TEXT,
    CONSTRAINT "TableAction_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TableAction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("content", "createdAt", "id", "playerId") SELECT "content", "createdAt", "id", "playerId" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE TABLE "new_Table" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "maxPlayers" INTEGER NOT NULL,
    "smallBlind" INTEGER NOT NULL,
    "bigBlind" INTEGER NOT NULL,
    "minBuyIn" INTEGER NOT NULL,
    "maxBuyIn" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "phase" TEXT NOT NULL DEFAULT 'waiting',
    "pot" INTEGER NOT NULL DEFAULT 0,
    "deck" TEXT,
    "board" TEXT,
    "currentPlayerId" TEXT,
    "dealerPosition" INTEGER NOT NULL DEFAULT 0,
    "smallBlindPosition" INTEGER NOT NULL DEFAULT 1,
    "bigBlindPosition" INTEGER NOT NULL DEFAULT 2,
    "currentBet" INTEGER NOT NULL DEFAULT 0,
    "minBet" INTEGER NOT NULL DEFAULT 0,
    "handNumber" INTEGER NOT NULL DEFAULT 1,
    "cardOrderSeed" TEXT,
    "cardOrder" TEXT,
    "cardOrderHash" TEXT,
    "isCardOrderRevealed" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Table" ("bigBlind", "createdAt", "createdBy", "id", "isActive", "isPrivate", "maxBuyIn", "maxPlayers", "minBuyIn", "name", "password", "smallBlind", "updatedAt") SELECT "bigBlind", "createdAt", "createdBy", "id", "isActive", "isPrivate", "maxBuyIn", "maxPlayers", "minBuyIn", "name", "password", "smallBlind", "updatedAt" FROM "Table";
DROP TABLE "Table";
ALTER TABLE "new_Table" RENAME TO "Table";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatar" TEXT,
    "chips" INTEGER NOT NULL DEFAULT 10000,
    "tablesPlayed" INTEGER NOT NULL DEFAULT 0,
    "tablesWon" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLoginAt" DATETIME,
    "roleId" TEXT NOT NULL DEFAULT 'player',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "bannedBy" TEXT,
    "bannedAt" DATETIME,
    "banReason" TEXT,
    "lastActiveAt" DATETIME,
    CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_User" ("avatar", "banReason", "bannedAt", "bannedBy", "chips", "createdAt", "displayName", "email", "id", "isActive", "isBanned", "lastActiveAt", "lastLoginAt", "password", "roleId", "updatedAt", "username") SELECT "avatar", "banReason", "bannedAt", "bannedBy", "chips", "createdAt", "displayName", "email", "id", "isActive", "isBanned", "lastActiveAt", "lastLoginAt", "password", "roleId", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TableAction_tableId_handNumber_actionSequence_idx" ON "TableAction"("tableId", "handNumber", "actionSequence");

-- CreateIndex
CREATE INDEX "TableAction_tableId_timestamp_idx" ON "TableAction"("tableId", "timestamp");
