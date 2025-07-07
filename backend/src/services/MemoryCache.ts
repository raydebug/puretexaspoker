import { EventEmitter } from 'events';

// Types for online data
export interface OnlineUser {
  id: string;
  nickname: string;
  socketId: string;
  tableId?: number;
  seatNumber?: number;
  lastActive: Date;
  isActive: boolean;
}

export interface OnlineGame {
  id: string;
  tableId: number;
  status: 'waiting' | 'active' | 'completed';
  phase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  players: OnlinePlayer[];
  pot: number;
  communityCards: string[];
  currentPlayer?: string;
  lastAction: Date;
}

export interface OnlinePlayer {
  id: string;
  nickname: string;
  seatNumber: number;
  chips: number;
  holeCards?: string[];
  isActive: boolean;
  isAllIn: boolean;
  lastAction?: Date;
}

export interface GameResult {
  gameId: string;
  tableId: number;
  winnerId: string;
  winnerNickname: string;
  winningHand: string;
  potAmount: number;
  players: {
    id: string;
    nickname: string;
    finalChips: number;
    netChange: number;
  }[];
  completedAt: Date;
}

export interface UserProfile {
  id: string;
  nickname: string;
  chips: number;
  gamesPlayed: number;
  gamesWon: number;
  totalWinnings: number;
  lastActive: Date;
}

export interface GameAction {
  id: string;
  gameId: string;
  playerId: string;
  playerName: string;
  action: 'bet' | 'call' | 'raise' | 'fold' | 'check' | 'allIn';
  amount?: number;
  phase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  handNumber: number;
  actionSequence: number;
  timestamp: Date;
  gameStateBefore?: string;
  gameStateAfter?: string;
}

class MemoryCache extends EventEmitter {
  private users: Map<string, OnlineUser> = new Map();
  private games: Map<string, OnlineGame> = new Map();
  private gameResults: Map<string, GameResult> = new Map();
  private userProfiles: Map<string, UserProfile> = new Map();
  private gameActions: Map<string, GameAction[]> = new Map(); // gameId -> actions[]
  
  // Sync intervals (in milliseconds)
  private readonly USER_SYNC_INTERVAL = 30000; // 30 seconds
  private readonly GAME_SYNC_INTERVAL = 10000; // 10 seconds
  private readonly RESULT_SYNC_INTERVAL = 60000; // 1 minute
  
  private syncTimers: NodeJS.Timeout[] = [];
  
  constructor() {
    super();
    this.startPeriodicSync();
  }
  
  // ===== USER MANAGEMENT =====
  
  addUser(user: OnlineUser): void {
    this.users.set(user.id, user);
    this.emit('userAdded', user);
  }
  
  updateUser(userId: string, updates: Partial<OnlineUser>): void {
    const user = this.users.get(userId);
    if (user) {
      Object.assign(user, updates, { lastActive: new Date() });
      this.users.set(userId, user);
      this.emit('userUpdated', user);
    }
  }
  
  removeUser(userId: string): OnlineUser | undefined {
    const user = this.users.get(userId);
    if (user) {
      this.users.delete(userId);
      this.emit('userRemoved', user);
    }
    return user;
  }
  
  getUser(userId: string): OnlineUser | undefined {
    return this.users.get(userId);
  }
  
  getOnlineUsers(): OnlineUser[] {
    return Array.from(this.users.values()).filter(u => u.isActive);
  }
  
  getUsersAtTable(tableId: number): OnlineUser[] {
    return Array.from(this.users.values()).filter(u => u.tableId === tableId && u.isActive);
  }
  
  // ===== GAME MANAGEMENT =====
  
  addGame(game: OnlineGame): void {
    // Validate game before adding
    if (!game.id || !game.tableId) {
      console.error('❌ Invalid game data:', game);
      return;
    }
    
    this.games.set(game.id, game);
    this.emit('gameAdded', game);
  }
  
  updateGame(gameId: string, updates: Partial<OnlineGame>): void {
    const game = this.games.get(gameId);
    if (game) {
      Object.assign(game, updates, { lastAction: new Date() });
      this.games.set(gameId, game);
      this.emit('gameUpdated', game);
    }
  }
  
  removeGame(gameId: string): OnlineGame | undefined {
    const game = this.games.get(gameId);
    if (game) {
      this.games.delete(gameId);
      this.emit('gameRemoved', game);
    }
    return game;
  }
  
  getGame(gameId: string): OnlineGame | undefined {
    return this.games.get(gameId);
  }
  
  getActiveGames(): OnlineGame[] {
    return Array.from(this.games.values()).filter(g => g.status === 'active');
  }
  
  getGamesAtTable(tableId: number): OnlineGame[] {
    return Array.from(this.games.values()).filter(g => g.tableId === tableId);
  }
  
  // ===== GAME RESULTS =====
  
  addGameResult(result: GameResult): void {
    this.gameResults.set(result.gameId, result);
    this.emit('gameResultAdded', result);
  }
  
  getGameResult(gameId: string): GameResult | undefined {
    return this.gameResults.get(gameId);
  }
  
  getPendingResults(): GameResult[] {
    return Array.from(this.gameResults.values());
  }
  
  // ===== USER PROFILES =====
  
  updateUserProfile(profile: UserProfile): void {
    this.userProfiles.set(profile.id, profile);
    this.emit('profileUpdated', profile);
  }
  
  getUserProfile(userId: string): UserProfile | undefined {
    return this.userProfiles.get(userId);
  }
  
  getUpdatedProfiles(): UserProfile[] {
    return Array.from(this.userProfiles.values());
  }
  
  // ===== ACTION HISTORY =====
  
  addGameAction(gameId: string, action: Omit<GameAction, 'id' | 'timestamp'>): void {
    const actions = this.gameActions.get(gameId) || [];
    const newAction: GameAction = {
      ...action,
      id: `${gameId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    
    actions.push(newAction);
    this.gameActions.set(gameId, actions);
    this.emit('actionAdded', newAction);
  }
  
  getGameActions(gameId: string, handNumber?: number): GameAction[] {
    const actions = this.gameActions.get(gameId) || [];
    if (handNumber !== undefined) {
      return actions.filter(action => action.handNumber === handNumber);
    }
    return actions;
  }
  
  getGameActionsByPhase(gameId: string, phase: string): GameAction[] {
    const actions = this.gameActions.get(gameId) || [];
    return actions.filter(action => action.phase === phase);
  }

  // ===== TABLE MANAGEMENT =====
  
  updateTable(tableId: number, updates: any): void {
    // For now, just emit an event for table updates
    this.emit('tableUpdated', { tableId, updates });
  }
  
  getLatestAction(gameId: string): GameAction | undefined {
    const actions = this.gameActions.get(gameId) || [];
    return actions[actions.length - 1];
  }
  
  clearGameActions(gameId: string): void {
    this.gameActions.delete(gameId);
    this.emit('actionsCleared', gameId);
  }
  
  getActionHistoryStats(): { totalGames: number; totalActions: number } {
    let totalActions = 0;
    this.gameActions.forEach(actions => {
      totalActions += actions.length;
    });
    
    return {
      totalGames: this.gameActions.size,
      totalActions
    };
  }
  
  // ===== PERIODIC SYNC =====
  
  private startPeriodicSync(): void {
    // Sync user profiles every 30 seconds
    this.syncTimers.push(setInterval(() => {
      this.syncUserProfiles();
    }, this.USER_SYNC_INTERVAL));
    
    // Sync active games every 10 seconds
    this.syncTimers.push(setInterval(() => {
      this.syncActiveGames();
    }, this.GAME_SYNC_INTERVAL));
    
    // Sync game results every minute
    this.syncTimers.push(setInterval(() => {
      this.syncGameResults();
    }, this.RESULT_SYNC_INTERVAL));
    
    console.log('🔄 Memory cache periodic sync started');
  }
  
  private async syncUserProfiles(): Promise<void> {
    try {
      const profiles = this.getUpdatedProfiles();
      if (profiles.length === 0) return;
      
      console.log(`🔄 Syncing ${profiles.length} user profiles to database...`);
      
      // Import Prisma client
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      for (const profile of profiles) {
        await prisma.player.upsert({
          where: { id: profile.id },
          update: {
            chips: profile.chips,
            updatedAt: new Date()
          },
          create: {
            id: profile.id,
            nickname: profile.nickname,
            chips: profile.chips
          }
        });
      }
      
      console.log(`✅ Synced ${profiles.length} user profiles`);
      
    } catch (error) {
      console.error('❌ Failed to sync user profiles:', error);
    }
  }
  
  private async syncActiveGames(): Promise<void> {
    try {
      const games = this.getActiveGames();
      if (games.length === 0) return;
      
      console.log(`🔄 Syncing ${games.length} active games to database...`);
      
      // Import Prisma client
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      let syncedCount = 0;
      let skippedCount = 0;
      
      for (const game of games) {
        try {
          // Check if table exists before trying to create/update game
          const table = await prisma.table.findFirst({
            where: { id: game.tableId }
          });
          
          if (!table) {
            console.log(`⚠️ Table ${game.tableId} not found, skipping game ${game.id} sync`);
            skippedCount++;
            // Remove invalid game from memory cache
            this.removeGame(game.id);
            continue;
          }
          
          await prisma.game.upsert({
            where: { id: game.id },
            update: {
              status: game.status,
              pot: game.pot,
              board: game.communityCards.length > 0 ? JSON.stringify(game.communityCards) : null,
              updatedAt: new Date()
            },
            create: {
              id: game.id,
              tableId: game.tableId,
              status: game.status,
              pot: game.pot,
              board: game.communityCards.length > 0 ? JSON.stringify(game.communityCards) : null
            }
          });
          
          syncedCount++;
          
        } catch (gameError) {
          console.error(`❌ Failed to sync game ${game.id}:`, gameError);
          // Continue with other games even if one fails
        }
      }
      
      console.log(`✅ Completed active games sync: ${syncedCount} synced, ${skippedCount} skipped`);
      
    } catch (error) {
      console.error('❌ Failed to sync active games:', error);
    }
  }
  
  private async syncGameResults(): Promise<void> {
    try {
      const results = this.getPendingResults();
      if (results.length === 0) return;
      
      console.log(`🔄 Syncing ${results.length} game results to database...`);
      
      // Import Prisma client
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      for (const result of results) {
        // Store game result in database
        await prisma.game.update({
          where: { id: result.gameId },
          data: {
            status: 'completed',
            updatedAt: result.completedAt
          }
        });
        
        // Update player chips based on results
        for (const player of result.players) {
          await prisma.player.update({
            where: { id: player.id },
            data: {
              chips: player.finalChips,
              updatedAt: new Date()
            }
          });
        }
        
        // Remove from pending results after successful sync
        this.gameResults.delete(result.gameId);
      }
      
      console.log(`✅ Synced ${results.length} game results`);
      
    } catch (error) {
      console.error('❌ Failed to sync game results:', error);
    }
  }
  
  // ===== UTILITY METHODS =====
  
  getStats(): {
    onlineUsers: number;
    activeGames: number;
    pendingResults: number;
    updatedProfiles: number;
    actionHistory: { totalGames: number; totalActions: number };
  } {
    return {
      onlineUsers: this.getOnlineUsers().length,
      activeGames: this.getActiveGames().length,
      pendingResults: this.getPendingResults().length,
      updatedProfiles: this.getUpdatedProfiles().length,
      actionHistory: this.getActionHistoryStats()
    };
  }
  
  clearCache(): void {
    this.users.clear();
    this.games.clear();
    this.gameResults.clear();
    this.userProfiles.clear();
    this.gameActions.clear();
    this.emit('cacheCleared');
  }
  
  stopSync(): void {
    this.syncTimers.forEach(timer => clearInterval(timer));
    this.syncTimers = [];
    console.log('🛑 Memory cache periodic sync stopped');
  }
  
  // Graceful shutdown
  async shutdown(): Promise<void> {
    console.log('🔄 Performing final sync before shutdown...');
    this.stopSync();
    
    // Perform final sync
    await Promise.all([
      this.syncUserProfiles(),
      this.syncActiveGames(),
      this.syncGameResults()
    ]);
    
    console.log('✅ Memory cache shutdown complete');
  }
}

// Export singleton instance
export const memoryCache = new MemoryCache(); 