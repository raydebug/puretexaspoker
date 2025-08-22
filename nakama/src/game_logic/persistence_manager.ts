/**
 * Game Persistence and Reconnection Manager for Nakama Backend
 * Comprehensive game state persistence, crash recovery, and session restoration
 */

import { ErrorFactory, NakamaError } from '../middleware/error_handling';
import { UserManagementService } from '../auth/user_management';

export interface GameSession {
  sessionId: string;
  userId: string;
  username: string;
  tableId: string;
  matchId: string;
  seatNumber: number;
  chips: number;
  cards: Card[];
  status: 'active' | 'disconnected' | 'eliminated' | 'folded';
  lastActionAt: string;
  disconnectedAt?: string;
  reconnectionAttempts: number;
  isProtected: boolean; // Protection from elimination during disconnect
}

export interface GameSnapshot {
  id: string;
  tableId: string;
  matchId: string;
  timestamp: string;
  gamePhase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  handNumber: number;
  pot: number;
  currentBet: number;
  currentPlayerId: string;
  communityCards: Card[];
  players: PlayerSnapshot[];
  blindLevel: BlindLevel;
  actionHistory: GameAction[];
  metadata: Record<string, any>;
}

export interface PlayerSnapshot {
  userId: string;
  username: string;
  seatNumber: number;
  chips: number;
  currentBet: number;
  cards: Card[];
  status: 'active' | 'folded' | 'allin' | 'disconnected';
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  lastActionAt: string;
}

export interface Card {
  rank: string;
  suit: string;
}

export interface BlindLevel {
  level: number;
  smallBlind: number;
  bigBlind: number;
  ante?: number;
}

export interface GameAction {
  id: string;
  playerId: string;
  playerName: string;
  action: string;
  amount?: number;
  timestamp: string;
  gamePhase: string;
  handNumber: number;
  gameStateBefore?: string;
  gameStateAfter?: string;
}

export interface ReconnectionData {
  session: GameSession;
  gameSnapshot: GameSnapshot;
  missedActions: GameAction[];
  timeRemaining?: number;
  canReconnect: boolean;
  reconnectionWindow: number; // minutes
}

/**
 * Game Persistence Manager
 */
export class PersistenceManager {
  private readonly nk: nkruntime.Nakama;
  private readonly logger: nkruntime.Logger;
  private readonly userService: UserManagementService;
  
  // Configuration
  private readonly SNAPSHOT_INTERVAL = 30; // seconds
  private readonly RECONNECTION_WINDOW = 300; // 5 minutes
  private readonly MAX_RECONNECTION_ATTEMPTS = 3;
  private readonly PROTECTION_DURATION = 180; // 3 minutes

  constructor(nk: nkruntime.Nakama, logger: nkruntime.Logger) {
    this.nk = nk;
    this.logger = logger;
    this.userService = new UserManagementService(nk, logger);
  }

  /**
   * Create game session for a player
   */
  public async createGameSession(
    userId: string,
    tableId: string,
    matchId: string,
    seatNumber: number,
    initialChips: number
  ): Promise<GameSession> {
    const userProfile = await this.userService.getUserProfile(userId);
    if (!userProfile) {
      throw ErrorFactory.notFoundError('User profile');
    }

    const sessionId = `session_${tableId}_${userId}_${Date.now()}`;
    
    const session: GameSession = {
      sessionId,
      userId,
      username: userProfile.username,
      tableId,
      matchId,
      seatNumber,
      chips: initialChips,
      cards: [],
      status: 'active',
      lastActionAt: new Date().toISOString(),
      reconnectionAttempts: 0,
      isProtected: false
    };

    await this.saveGameSession(session);
    
    this.logger.info(`🎮 Game session created: ${sessionId} for ${userProfile.username}`);
    return session;
  }

  /**
   * Save game session
   */
  public async saveGameSession(session: GameSession): Promise<void> {
    await this.nk.storageWrite([{
      collection: "game_sessions",
      key: session.sessionId,
      userId: session.userId,
      value: session,
      permissionRead: 1, // Owner read
      permissionWrite: 1  // Owner write
    }]);

    // Also maintain a lookup by userId for quick access
    await this.nk.storageWrite([{
      collection: "user_sessions",
      key: `active_${session.userId}`,
      userId: session.userId,
      value: { 
        sessionId: session.sessionId,
        tableId: session.tableId,
        lastUpdate: new Date().toISOString()
      },
      permissionRead: 1,
      permissionWrite: 1
    }]);
  }

  /**
   * Create game snapshot
   */
  public async createGameSnapshot(
    tableId: string,
    matchId: string,
    gameState: any
  ): Promise<GameSnapshot> {
    const snapshotId = `snapshot_${tableId}_${Date.now()}`;
    
    const snapshot: GameSnapshot = {
      id: snapshotId,
      tableId,
      matchId,
      timestamp: new Date().toISOString(),
      gamePhase: gameState.phase || 'preflop',
      handNumber: gameState.handNumber || 1,
      pot: gameState.pot || 0,
      currentBet: gameState.currentBet || 0,
      currentPlayerId: gameState.currentPlayerId || '',
      communityCards: gameState.communityCards || [],
      players: this.extractPlayerSnapshots(gameState.players || {}),
      blindLevel: gameState.blindLevel || { level: 1, smallBlind: 5, bigBlind: 10 },
      actionHistory: gameState.actionHistory || [],
      metadata: {
        ...gameState.metadata,
        snapshotVersion: '1.0',
        totalPlayers: Object.keys(gameState.players || {}).length
      }
    };

    await this.saveGameSnapshot(snapshot);
    
    // Keep only recent snapshots (last 10)
    await this.cleanupOldSnapshots(tableId, 10);
    
    return snapshot;
  }

  /**
   * Save game snapshot
   */
  public async saveGameSnapshot(snapshot: GameSnapshot): Promise<void> {
    await this.nk.storageWrite([{
      collection: "game_snapshots",
      key: snapshot.id,
      userId: "",
      value: snapshot,
      permissionRead: 2, // Public read for game restoration
      permissionWrite: 0  // System only write
    }]);

    // Maintain latest snapshot reference
    await this.nk.storageWrite([{
      collection: "latest_snapshots",
      key: snapshot.tableId,
      userId: "",
      value: {
        snapshotId: snapshot.id,
        timestamp: snapshot.timestamp,
        handNumber: snapshot.handNumber
      },
      permissionRead: 2,
      permissionWrite: 0
    }]);
  }

  /**
   * Handle player disconnection
   */
  public async handlePlayerDisconnection(
    userId: string,
    tableId: string,
    reason: 'network' | 'crash' | 'manual' = 'network'
  ): Promise<void> {
    const session = await this.getActiveGameSession(userId);
    if (!session || session.tableId !== tableId) {
      this.logger.warn(`No active session found for disconnecting user ${userId}`);
      return;
    }

    // Update session status
    session.status = 'disconnected';
    session.disconnectedAt = new Date().toISOString();
    session.reconnectionAttempts = 0;

    // Activate protection if appropriate
    if (reason === 'network' || reason === 'crash') {
      session.isProtected = true;
      
      // Schedule protection removal
      setTimeout(async () => {
        await this.removeDisconnectionProtection(session.sessionId);
      }, this.PROTECTION_DURATION * 1000);
    }

    await this.saveGameSession(session);

    // Create disconnection record
    await this.recordDisconnection(userId, tableId, reason);

    this.logger.info(`🔌 Player disconnected: ${session.username} from table ${tableId} (${reason})`);
  }

  /**
   * Attempt player reconnection
   */
  public async attemptPlayerReconnection(
    userId: string,
    tableId: string
  ): Promise<ReconnectionData> {
    const session = await this.getActiveGameSession(userId);
    if (!session || session.tableId !== tableId) {
      throw ErrorFactory.notFoundError('Active game session');
    }

    // Check if reconnection window is still open
    const disconnectedAt = new Date(session.disconnectedAt || '').getTime();
    const now = Date.now();
    const timeSinceDisconnection = (now - disconnectedAt) / 1000 / 60; // minutes

    if (timeSinceDisconnection > this.RECONNECTION_WINDOW) {
      throw ErrorFactory.gameStateError('Reconnection window expired');
    }

    // Check reconnection attempts
    if (session.reconnectionAttempts >= this.MAX_RECONNECTION_ATTEMPTS) {
      throw ErrorFactory.gameStateError('Maximum reconnection attempts exceeded');
    }

    // Get latest game snapshot
    const gameSnapshot = await this.getLatestGameSnapshot(tableId);
    if (!gameSnapshot) {
      throw ErrorFactory.notFoundError('Game snapshot for restoration');
    }

    // Get missed actions since disconnection
    const missedActions = await this.getMissedActions(tableId, session.disconnectedAt || '');

    // Update session
    session.status = 'active';
    session.reconnectionAttempts++;
    session.lastActionAt = new Date().toISOString();
    session.disconnectedAt = undefined;

    await this.saveGameSession(session);

    const reconnectionData: ReconnectionData = {
      session,
      gameSnapshot,
      missedActions,
      timeRemaining: this.RECONNECTION_WINDOW - timeSinceDisconnection,
      canReconnect: true,
      reconnectionWindow: this.RECONNECTION_WINDOW
    };

    this.logger.info(`🔄 Player reconnected: ${session.username} to table ${tableId} (attempt ${session.reconnectionAttempts})`);
    return reconnectionData;
  }

  /**
   * Restore game state from snapshot
   */
  public async restoreGameState(snapshotId: string): Promise<GameSnapshot> {
    try {
      const result = await this.nk.storageRead([{
        collection: "game_snapshots",
        key: snapshotId,
        userId: ""
      }]);

      if (!result || result.length === 0) {
        throw ErrorFactory.notFoundError('Game snapshot');
      }

      const snapshot = result[0].value as GameSnapshot;
      
      this.logger.info(`🔄 Game state restored from snapshot: ${snapshotId}`);
      return snapshot;
    } catch (error) {
      throw ErrorFactory.storageError('Failed to restore game state');
    }
  }

  /**
   * Record game action for history
   */
  public async recordGameAction(
    tableId: string,
    action: Omit<GameAction, 'id' | 'timestamp'>
  ): Promise<GameAction> {
    const gameAction: GameAction = {
      ...action,
      id: `action_${tableId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    await this.nk.storageWrite([{
      collection: "game_actions",
      key: gameAction.id,
      userId: action.playerId,
      value: gameAction,
      permissionRead: 2, // Public read for game history
      permissionWrite: 1  // Owner write
    }]);

    // Maintain action index by table
    await this.nk.storageWrite([{
      collection: "table_action_index",
      key: `${tableId}_${gameAction.timestamp}_${gameAction.id}`,
      userId: "",
      value: {
        actionId: gameAction.id,
        tableId,
        playerId: action.playerId,
        action: action.action,
        timestamp: gameAction.timestamp
      },
      permissionRead: 2,
      permissionWrite: 0
    }]);

    return gameAction;
  }

  /**
   * Get active game session for user
   */
  public async getActiveGameSession(userId: string): Promise<GameSession | null> {
    try {
      // First check the active session lookup
      const lookupResult = await this.nk.storageRead([{
        collection: "user_sessions",
        key: `active_${userId}`,
        userId: userId
      }]);

      if (!lookupResult || lookupResult.length === 0) {
        return null;
      }

      const lookup = lookupResult[0].value;
      
      // Get the actual session
      const sessionResult = await this.nk.storageRead([{
        collection: "game_sessions",
        key: lookup.sessionId,
        userId: userId
      }]);

      if (!sessionResult || sessionResult.length === 0) {
        return null;
      }

      return sessionResult[0].value as GameSession;
    } catch (error) {
      this.logger.error('Error getting active game session:', error);
      return null;
    }
  }

  /**
   * Get latest game snapshot for table
   */
  public async getLatestGameSnapshot(tableId: string): Promise<GameSnapshot | null> {
    try {
      // Get latest snapshot reference
      const refResult = await this.nk.storageRead([{
        collection: "latest_snapshots",
        key: tableId,
        userId: ""
      }]);

      if (!refResult || refResult.length === 0) {
        return null;
      }

      const ref = refResult[0].value;
      
      // Get the actual snapshot
      const snapshotResult = await this.nk.storageRead([{
        collection: "game_snapshots",
        key: ref.snapshotId,
        userId: ""
      }]);

      if (!snapshotResult || snapshotResult.length === 0) {
        return null;
      }

      return snapshotResult[0].value as GameSnapshot;
    } catch (error) {
      this.logger.error('Error getting latest game snapshot:', error);
      return null;
    }
  }

  /**
   * Get missed actions since timestamp
   */
  public async getMissedActions(tableId: string, since: string): Promise<GameAction[]> {
    try {
      const result = await this.nk.storageList("", "table_action_index", 1000);
      const allActions = result.objects?.map(obj => obj.value) || [];
      
      // Filter actions for this table since the given timestamp
      const missedActions = allActions
        .filter((action: any) => 
          action.tableId === tableId && 
          new Date(action.timestamp) > new Date(since)
        )
        .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Get full action details
      const detailedActions: GameAction[] = [];
      for (const actionRef of missedActions) {
        try {
          const actionResult = await this.nk.storageRead([{
            collection: "game_actions",
            key: actionRef.actionId,
            userId: ""
          }]);
          
          if (actionResult && actionResult.length > 0) {
            detailedActions.push(actionResult[0].value as GameAction);
          }
        } catch (error) {
          this.logger.warn(`Failed to get action details for ${actionRef.actionId}`);
        }
      }

      return detailedActions;
    } catch (error) {
      this.logger.error('Error getting missed actions:', error);
      return [];
    }
  }

  /**
   * Cleanup old game data
   */
  public async cleanupGameData(tableId: string): Promise<void> {
    try {
      // Remove old snapshots (keep last 5)
      await this.cleanupOldSnapshots(tableId, 5);
      
      // Remove old action indexes (older than 24 hours)
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await this.cleanupOldActionIndexes(tableId, cutoffTime);
      
      this.logger.info(`🧹 Cleaned up old game data for table ${tableId}`);
    } catch (error) {
      this.logger.error('Error cleaning up game data:', error);
    }
  }

  /**
   * Helper methods
   */
  private extractPlayerSnapshots(players: Record<string, any>): PlayerSnapshot[] {
    return Object.values(players).map((player: any) => ({
      userId: player.id || player.userId,
      username: player.name || player.username,
      seatNumber: player.seat || player.seatNumber,
      chips: player.chips || 0,
      currentBet: player.currentBet || 0,
      cards: player.cards || [],
      status: player.status || 'active',
      isDealer: player.isDealer || false,
      isSmallBlind: player.isSmallBlind || false,
      isBigBlind: player.isBigBlind || false,
      lastActionAt: player.lastActionAt || new Date().toISOString()
    }));
  }

  private async cleanupOldSnapshots(tableId: string, keepCount: number): Promise<void> {
    try {
      const result = await this.nk.storageList("", "game_snapshots", 100);
      const allSnapshots = result.objects?.map(obj => ({
        key: obj.key,
        value: obj.value as GameSnapshot
      })) || [];

      // Filter for this table and sort by timestamp
      const tableSnapshots = allSnapshots
        .filter(snapshot => snapshot.value.tableId === tableId)
        .sort((a, b) => new Date(b.value.timestamp).getTime() - new Date(a.value.timestamp).getTime());

      // Remove old snapshots
      if (tableSnapshots.length > keepCount) {
        const toDelete = tableSnapshots.slice(keepCount);
        const deleteOps = toDelete.map(snapshot => ({
          collection: "game_snapshots",
          key: snapshot.key,
          userId: ""
        }));

        await this.nk.storageDelete(deleteOps);
      }
    } catch (error) {
      this.logger.error('Error cleaning up old snapshots:', error);
    }
  }

  private async cleanupOldActionIndexes(tableId: string, cutoffTime: string): Promise<void> {
    try {
      const result = await this.nk.storageList("", "table_action_index", 1000);
      const allIndexes = result.objects?.map(obj => ({
        key: obj.key,
        value: obj.value
      })) || [];

      // Filter old actions for this table
      const oldIndexes = allIndexes.filter((index: any) => 
        index.value.tableId === tableId && 
        index.value.timestamp < cutoffTime
      );

      if (oldIndexes.length > 0) {
        const deleteOps = oldIndexes.map(index => ({
          collection: "table_action_index",
          key: index.key,
          userId: ""
        }));

        await this.nk.storageDelete(deleteOps);
      }
    } catch (error) {
      this.logger.error('Error cleaning up old action indexes:', error);
    }
  }

  private async recordDisconnection(
    userId: string,
    tableId: string,
    reason: string
  ): Promise<void> {
    const record = {
      userId,
      tableId,
      reason,
      timestamp: new Date().toISOString(),
      reconnected: false
    };

    await this.nk.storageWrite([{
      collection: "disconnection_records",
      key: `disconnect_${userId}_${Date.now()}`,
      userId: userId,
      value: record,
      permissionRead: 1,
      permissionWrite: 1
    }]);
  }

  private async removeDisconnectionProtection(sessionId: string): Promise<void> {
    try {
      const result = await this.nk.storageRead([{
        collection: "game_sessions",
        key: sessionId,
        userId: ""
      }]);

      if (result && result.length > 0) {
        const session = result[0].value as GameSession;
        session.isProtected = false;
        await this.saveGameSession(session);
        
        this.logger.info(`🛡️ Disconnection protection removed for session ${sessionId}`);
      }
    } catch (error) {
      this.logger.error('Error removing disconnection protection:', error);
    }
  }
}
