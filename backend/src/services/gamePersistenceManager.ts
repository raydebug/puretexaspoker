import { prisma } from '../db';
import { GameState, Player } from '../types/shared';
import { GameSession, PlayerSession, GameActionHistory, ConnectionLog } from '@prisma/client';
import crypto from 'crypto';

export interface SessionInfo {
  userId: string;
  gameId: string;
  playerId: string;
  isConnected: boolean;
  lastSeen: Date;
  reconnectToken: string;
}

export interface ReconnectionData {
  gameState: GameState;
  playerSession: SessionInfo;
  missedActions: GameActionHistory[];
  connectionStatus: 'active' | 'reconnecting' | 'timeout' | 'away';
}

export interface GamePersistenceOptions {
  autoSaveInterval: number; // Milliseconds between auto-saves
  sessionTimeoutMinutes: number; // Minutes before session timeout
  maxReconnectionAttempts: number;
  compressionEnabled: boolean;
}

export class GamePersistenceManager {
  private static instance: GamePersistenceManager;
  private autoSaveIntervals: Map<string, NodeJS.Timeout> = new Map();
  private options: GamePersistenceOptions;

  constructor(options?: Partial<GamePersistenceOptions>) {
    this.options = {
      autoSaveInterval: 5000, // 5 seconds
      sessionTimeoutMinutes: 10,
      maxReconnectionAttempts: 3,
      compressionEnabled: true,
      ...options
    };
  }

  public static getInstance(options?: Partial<GamePersistenceOptions>): GamePersistenceManager {
    if (!GamePersistenceManager.instance) {
      GamePersistenceManager.instance = new GamePersistenceManager(options);
    }
    return GamePersistenceManager.instance;
  }

  // GAME PERSISTENCE: Save complete game state to database
  public async saveGameState(gameId: string, gameState: GameState, tableId: string, lastAction?: string): Promise<void> {
    try {
      console.log(`💾 PERSISTENCE: Saving game state for ${gameId}...`);
      
      const serializedGameState = this.serializeGameState(gameState);
      
      await prisma.gameSession.upsert({
        where: { gameId },
        update: {
          gameState: serializedGameState,
          lastAction,
          lastActionTime: new Date(),
          currentPhase: gameState.phase,
          isActive: !gameState.isHandComplete,
          updatedAt: new Date()
        },
        create: {
          gameId,
          tableId,
          gameState: serializedGameState,
          lastAction,
          currentPhase: gameState.phase,
          isActive: !gameState.isHandComplete
        }
      });
      
      console.log(`✅ PERSISTENCE: Game state saved for ${gameId}`);
    } catch (error) {
      console.error('❌ PERSISTENCE: Error saving game state:', error);
      throw error;
    }
  }

  // GAME PERSISTENCE: Restore game state from database
  public async restoreGameState(gameId: string): Promise<GameState | null> {
    try {
      console.log(`🔄 PERSISTENCE: Restoring game state for ${gameId}...`);
      
      const gameSession = await prisma.gameSession.findUnique({
        where: { gameId },
        include: {
          playerSessions: {
            where: { isActive: true },
            include: { user: true }
          }
        }
      });
      
      if (!gameSession) {
        console.log(`❌ PERSISTENCE: No saved game state found for ${gameId}`);
        return null;
      }
      
      const gameState = this.deserializeGameState(gameSession.gameState);
      
      // Update player connection statuses
      gameState.players = await this.updatePlayerConnectionStatuses(gameState.players, gameSession.playerSessions);
      
      console.log(`✅ PERSISTENCE: Game state restored for ${gameId}`);
      return gameState;
    } catch (error) {
      console.error('❌ PERSISTENCE: Error restoring game state:', error);
      throw error;
    }
  }

  // GAME PERSISTENCE: Create or update player session
  public async createPlayerSession(userId: string, gameId: string, playerId: string, socketId?: string): Promise<SessionInfo> {
    try {
      console.log(`👤 SESSION: Creating/updating session for user ${userId} in game ${gameId}...`);
      
      const reconnectToken = this.generateReconnectToken(userId, gameId);
      
      const playerSession = await prisma.playerSession.upsert({
        where: { userId_gameId: { userId, gameId } },
        update: {
          socketId,
          isConnected: true,
          lastSeen: new Date(),
          reconnectToken,
          isActive: true,
          leftAt: null
        },
        create: {
          userId,
          gameId,
          playerId,
          socketId,
          reconnectToken,
          isConnected: true,
          isActive: true
        }
      });
      
      // Log connection
      await this.logConnection(userId, socketId || 'unknown', gameId, 'connect');
      
      console.log(`✅ SESSION: Player session created/updated for ${userId}`);
      
      return {
        userId,
        gameId,
        playerId,
        isConnected: true,
        lastSeen: playerSession.lastSeen,
        reconnectToken
      };
    } catch (error) {
      console.error('❌ SESSION: Error creating player session:', error);
      throw error;
    }
  }

  // GAME PERSISTENCE: Handle player disconnection
  public async handlePlayerDisconnection(userId: string, gameId: string, socketId: string, reason?: string): Promise<void> {
    try {
      console.log(`❌ SESSION: Handling disconnection for user ${userId} in game ${gameId}...`);
      
      await prisma.playerSession.updateMany({
        where: { userId, gameId },
        data: {
          isConnected: false,
          lastSeen: new Date(),
          socketId: null
        }
      });
      
      // Log disconnection
      await this.logConnection(userId, socketId, gameId, 'disconnect', reason);
      
      console.log(`✅ SESSION: Disconnection handled for ${userId}`);
    } catch (error) {
      console.error('❌ SESSION: Error handling disconnection:', error);
      throw error;
    }
  }

  // GAME PERSISTENCE: Handle player reconnection
  public async handlePlayerReconnection(userId: string, gameId: string, socketId: string, reconnectToken?: string): Promise<ReconnectionData | null> {
    try {
      console.log(`🔄 SESSION: Handling reconnection for user ${userId} in game ${gameId}...`);
      
      // Verify reconnect token if provided
      if (reconnectToken) {
        const isValidToken = await this.verifyReconnectToken(userId, gameId, reconnectToken);
        if (!isValidToken) {
          console.log(`❌ SESSION: Invalid reconnect token for ${userId}`);
          return null;
        }
      }
      
      // Get player session
      const playerSession = await prisma.playerSession.findUnique({
        where: { userId_gameId: { userId, gameId } }
      });
      
      if (!playerSession || !playerSession.isActive) {
        console.log(`❌ SESSION: No active session found for ${userId} in game ${gameId}`);
        return null;
      }
      
      // Update session as connected
      await prisma.playerSession.update({
        where: { userId_gameId: { userId, gameId } },
        data: {
          socketId,
          isConnected: true,
          lastSeen: new Date()
        }
      });
      
      // Get current game state
      const gameState = await this.restoreGameState(gameId);
      if (!gameState) {
        console.log(`❌ SESSION: No game state found for ${gameId}`);
        return null;
      }
      
      // Get missed actions since disconnection
      const missedActions = await this.getMissedActions(gameId, playerSession.lastSeen);
      
      // Log reconnection
      await this.logConnection(userId, socketId, gameId, 'reconnect');
      
      console.log(`✅ SESSION: Reconnection successful for ${userId}`);
      
      return {
        gameState,
        playerSession: {
          userId,
          gameId,
          playerId: playerSession.playerId,
          isConnected: true,
          lastSeen: new Date(),
          reconnectToken: playerSession.reconnectToken || ''
        },
        missedActions,
        connectionStatus: 'active'
      };
    } catch (error) {
      console.error('❌ SESSION: Error handling reconnection:', error);
      throw error;
    }
  }

  // GAME PERSISTENCE: Record game action for history and replay
  public async recordGameAction(
    gameId: string,
    playerId: string,
    playerName: string,
    action: string,
    amount?: number,
    phase?: string,
    handNumber?: number,
    gameStateBefore?: GameState,
    gameStateAfter?: GameState
  ): Promise<void> {
    try {
      // Get next sequence number for this hand
      const lastAction = await prisma.gameActionHistory.findFirst({
        where: { gameId, handNumber: handNumber || 1 },
        orderBy: { actionSequence: 'desc' }
      });
      
      const actionSequence = (lastAction?.actionSequence || 0) + 1;
      
      await prisma.gameActionHistory.create({
        data: {
          gameId,
          playerId,
          playerName,
          action,
          amount,
          phase: phase || 'unknown',
          handNumber: handNumber || 1,
          actionSequence,
          gameStateBefore: gameStateBefore ? this.serializeGameState(gameStateBefore) : null,
          gameStateAfter: gameStateAfter ? this.serializeGameState(gameStateAfter) : null
        }
      });
      
      console.log(`📝 ACTION: Recorded ${action} by ${playerName} in ${gameId}`);
    } catch (error) {
      console.error('❌ ACTION: Error recording game action:', error);
      throw error;
    }
  }

  // GAME PERSISTENCE: Get action history for replay
  public async getActionHistory(gameId: string, handNumber?: number): Promise<GameActionHistory[]> {
    try {
      const where = handNumber ? { gameId, handNumber } : { gameId };
      
      return await prisma.gameActionHistory.findMany({
        where,
        orderBy: [
          { handNumber: 'asc' },
          { actionSequence: 'asc' }
        ]
      });
    } catch (error) {
      console.error('❌ ACTION: Error getting action history:', error);
      throw error;
    }
  }

  // GAME PERSISTENCE: Check for timed out sessions
  public async checkSessionTimeouts(gameId: string): Promise<string[]> {
    try {
      const timeoutThreshold = new Date(Date.now() - this.options.sessionTimeoutMinutes * 60 * 1000);
      
      const timedOutSessions = await prisma.playerSession.findMany({
        where: {
          gameId,
          isActive: true,
          isConnected: false,
          lastSeen: { lt: timeoutThreshold }
        }
      });
      
      const timedOutUserIds = timedOutSessions.map(session => session.userId);
      
      if (timedOutUserIds.length > 0) {
        console.log(`⏰ SESSION: Found ${timedOutUserIds.length} timed out sessions in ${gameId}`);
        
        // Mark sessions as inactive
        await prisma.playerSession.updateMany({
          where: {
            gameId,
            userId: { in: timedOutUserIds }
          },
          data: {
            isActive: false,
            leftAt: new Date()
          }
        });
        
        // Log timeouts
        for (const userId of timedOutUserIds) {
          await this.logConnection(userId, 'timeout', gameId, 'timeout', 'Session timeout');
        }
      }
      
      return timedOutUserIds;
    } catch (error) {
      console.error('❌ SESSION: Error checking timeouts:', error);
      throw error;
    }
  }

  // GAME PERSISTENCE: Start auto-save for a game
  public startAutoSave(gameId: string, gameStateProvider: () => GameState, tableId: string): void {
    if (this.autoSaveIntervals.has(gameId)) {
      this.stopAutoSave(gameId);
    }
    
    const interval = setInterval(async () => {
      try {
        const gameState = gameStateProvider();
        await this.saveGameState(gameId, gameState, tableId);
      } catch (error) {
        console.error(`❌ AUTO-SAVE: Error saving game ${gameId}:`, error);
      }
    }, this.options.autoSaveInterval);
    
    this.autoSaveIntervals.set(gameId, interval);
    console.log(`🔄 AUTO-SAVE: Started for game ${gameId} (interval: ${this.options.autoSaveInterval}ms)`);
  }

  // GAME PERSISTENCE: Stop auto-save for a game
  public stopAutoSave(gameId: string): void {
    const interval = this.autoSaveIntervals.get(gameId);
    if (interval) {
      clearInterval(interval);
      this.autoSaveIntervals.delete(gameId);
      console.log(`⏹️ AUTO-SAVE: Stopped for game ${gameId}`);
    }
  }

  // GAME PERSISTENCE: Get active player sessions for a game
  public async getActivePlayerSessions(gameId: string): Promise<PlayerSession[]> {
    try {
      return await prisma.playerSession.findMany({
        where: {
          gameId,
          isActive: true
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true
            }
          }
        }
      });
    } catch (error) {
      console.error('❌ SESSION: Error getting active sessions:', error);
      throw error;
    }
  }

  // GAME PERSISTENCE: Private helper methods

  private serializeGameState(gameState: GameState): string {
    return JSON.stringify(gameState);
  }

  private deserializeGameState(serializedState: string): GameState {
    return JSON.parse(serializedState);
  }

  private generateReconnectToken(userId: string, gameId: string): string {
    const data = `${userId}:${gameId}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private async verifyReconnectToken(userId: string, gameId: string, token: string): Promise<boolean> {
    try {
      const session = await prisma.playerSession.findUnique({
        where: { userId_gameId: { userId, gameId } }
      });
      
      return session?.reconnectToken === token;
    } catch (error) {
      console.error('❌ TOKEN: Error verifying reconnect token:', error);
      return false;
    }
  }

  private async getMissedActions(gameId: string, since: Date): Promise<GameActionHistory[]> {
    try {
      return await prisma.gameActionHistory.findMany({
        where: {
          gameId,
          timestamp: { gt: since }
        },
        orderBy: { timestamp: 'asc' }
      });
    } catch (error) {
      console.error('❌ ACTION: Error getting missed actions:', error);
      return [];
    }
  }

  private async updatePlayerConnectionStatuses(players: Player[], sessions: any[]): Promise<Player[]> {
    return players.map(player => {
      const session = sessions.find(s => s.playerId === player.id);
      return {
        ...player,
        isConnected: session?.isConnected || false,
        lastSeen: session?.lastSeen || new Date()
      };
    });
  }

  private async logConnection(userId: string, socketId: string, gameId: string | null, action: string, reason?: string): Promise<void> {
    try {
      await prisma.connectionLog.create({
        data: {
          userId,
          socketId,
          gameId,
          action,
          reason
        }
      });
    } catch (error) {
      console.error('❌ LOG: Error logging connection:', error);
    }
  }

  // GAME PERSISTENCE: Cleanup methods

  public async cleanupInactiveSessions(olderThanHours: number = 24): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
      
      const result = await prisma.playerSession.deleteMany({
        where: {
          isActive: false,
          leftAt: { lt: cutoffTime }
        }
      });
      
      console.log(`🧹 CLEANUP: Removed ${result.count} inactive sessions older than ${olderThanHours} hours`);
      return result.count;
    } catch (error) {
      console.error('❌ CLEANUP: Error cleaning up sessions:', error);
      throw error;
    }
  }

  public async cleanupOldActionHistory(olderThanDays: number = 30): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      
      const result = await prisma.gameActionHistory.deleteMany({
        where: {
          timestamp: { lt: cutoffTime }
        }
      });
      
      console.log(`🧹 CLEANUP: Removed ${result.count} action history records older than ${olderThanDays} days`);
      return result.count;
    } catch (error) {
      console.error('❌ CLEANUP: Error cleaning up action history:', error);
      throw error;
    }
  }
}

export const gamePersistenceManager = GamePersistenceManager.getInstance(); 