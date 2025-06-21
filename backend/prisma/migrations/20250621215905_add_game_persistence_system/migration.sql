-- CreateTable
CREATE TABLE "PlayerSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "socketId" TEXT,
    "isConnected" BOOLEAN NOT NULL DEFAULT true,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "reconnectToken" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlayerSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PlayerSession_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "GameSession" ("gameId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "gameState" TEXT NOT NULL,
    "lastAction" TEXT,
    "lastActionTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPhase" TEXT NOT NULL DEFAULT 'waiting',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "pauseReason" TEXT,
    "pausedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GameSession_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GameActionHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "amount" INTEGER,
    "phase" TEXT NOT NULL,
    "handNumber" INTEGER NOT NULL DEFAULT 1,
    "actionSequence" INTEGER NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gameStateBefore" TEXT,
    "gameStateAfter" TEXT,
    CONSTRAINT "GameActionHistory_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "GameSession" ("gameId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConnectionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "socketId" TEXT NOT NULL,
    "gameId" TEXT,
    "action" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "reason" TEXT,
    CONSTRAINT "ConnectionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PlayerSession_gameId_idx" ON "PlayerSession"("gameId");

-- CreateIndex
CREATE INDEX "PlayerSession_socketId_idx" ON "PlayerSession"("socketId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSession_userId_gameId_key" ON "PlayerSession"("userId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "GameSession_gameId_key" ON "GameSession"("gameId");

-- CreateIndex
CREATE INDEX "GameActionHistory_gameId_handNumber_actionSequence_idx" ON "GameActionHistory"("gameId", "handNumber", "actionSequence");

-- CreateIndex
CREATE INDEX "GameActionHistory_gameId_timestamp_idx" ON "GameActionHistory"("gameId", "timestamp");

-- CreateIndex
CREATE INDEX "ConnectionLog_userId_timestamp_idx" ON "ConnectionLog"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "ConnectionLog_gameId_timestamp_idx" ON "ConnectionLog"("gameId", "timestamp");
