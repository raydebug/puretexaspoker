import { Server as SocketIOServer } from 'socket.io';
// import { gameManager } from './gameManager';

interface PlayerTimeout {
  gameId: string;
  playerId: string;
  playerName: string;
  timeoutId: NodeJS.Timeout;
  startTime: number;
  timeLimit: number;
}

class PlayerTimeoutService {
  private activeTimeouts: Map<string, PlayerTimeout> = new Map();
  private io: SocketIOServer | null = null;
  private readonly DECISION_TIMEOUT_MS = 10000; // 10 seconds

  setSocketServer(socketServer: SocketIOServer) {
    this.io = socketServer;
  }

  /**
   * Start a decision timeout for a player
   */
  startPlayerTimeout(gameId: string, playerId: string, playerName: string): void {
    // Clear any existing timeout for this player
    this.clearPlayerTimeout(playerId);

    console.log(`⏰ Starting ${this.DECISION_TIMEOUT_MS / 1000}s timeout for player ${playerName} (${playerId})`);

    const timeoutId = setTimeout(() => {
      this.handlePlayerTimeout(gameId, playerId, playerName);
    }, this.DECISION_TIMEOUT_MS);

    const timeout: PlayerTimeout = {
      gameId,
      playerId,
      playerName,
      timeoutId,
      startTime: Date.now(),
      timeLimit: this.DECISION_TIMEOUT_MS
    };

    this.activeTimeouts.set(playerId, timeout);

    // Emit timeout start event to all players in the game
    if (this.io) {
      this.io.to(`game:${gameId}`).emit('playerTimeout:start', {
        playerId,
        playerName,
        timeLimit: this.DECISION_TIMEOUT_MS / 1000
      });
    }
  }

  /**
   * Clear timeout for a player (called when they make an action)
   */
  clearPlayerTimeout(playerId: string): boolean {
    const timeout = this.activeTimeouts.get(playerId);
    if (!timeout) {
      return false;
    }

    clearTimeout(timeout.timeoutId);
    this.activeTimeouts.delete(playerId);

    console.log(`✅ Cleared timeout for player ${timeout.playerName} (${playerId})`);

    // Emit timeout cleared event
    if (this.io) {
      this.io.to(`game:${timeout.gameId}`).emit('playerTimeout:cleared', {
        playerId,
        playerName: timeout.playerName
      });
    }

    return true;
  }

  /**
   * Handle when a player times out (automatically fold them)
   */
  private async handlePlayerTimeout(gameId: string, playerId: string, playerName: string): Promise<void> {
    console.log(`⏰ Player ${playerName} (${playerId}) timed out - auto-folding (Logic disabled in Table-Only architecture)`);
    /*
    try {
      // Remove from active timeouts
      this.activeTimeouts.delete(playerId);

      // Get the game
      // @ts-ignore - gameManager no longer exists in table-only architecture
      const gameService = gameManager.getGame(gameId);
      if (!gameService) {
        console.error(`❌ Game ${gameId} not found for timeout handling`);
        return;
      }

      const gameState = gameService.getGameState();
      
      // Verify this player is still the current player
      if (gameState.currentPlayerId !== playerId) {
        console.log(`⚠️ Player ${playerName} is no longer current player, ignoring timeout`);
        return;
      }

      // Auto-fold the player
      await gameService.fold(playerId);

      // Emit timeout event to all players
      if (this.io) {
        this.io.to(`game:${gameId}`).emit('playerTimeout:expired', {
          playerId,
          playerName,
          action: 'fold'
        });

        this.io.to(`game:${gameId}`).emit('gameAction', {
          action: 'fold',
          playerId,
          playerName,
          automatic: true,
          reason: 'timeout'
        });

        // Emit updated game state
        const updatedGameState = gameService.getGameState();
        this.io.to(`game:${gameId}`).emit('gameState', updatedGameState);
      }

      console.log(`✅ Successfully auto-folded ${playerName} due to timeout`);

    } catch (error) {
      console.error(`❌ Error handling timeout for player ${playerName}:`, error);
      
      // Still emit timeout event even if fold failed
      if (this.io) {
        this.io.to(`game:${gameId}`).emit('playerTimeout:error', {
          playerId,
          playerName,
          error: 'Failed to process timeout'
        });
      }
    }
    */
  }

  /**
   * Get remaining time for a player's timeout
   */
  getRemainingTime(playerId: string): number | null {
    const timeout = this.activeTimeouts.get(playerId);
    if (!timeout) {
      return null;
    }

    const elapsed = Date.now() - timeout.startTime;
    const remaining = Math.max(0, timeout.timeLimit - elapsed);
    return Math.ceil(remaining / 1000); // Return seconds
  }

  /**
   * Check if a player has an active timeout
   */
  hasActiveTimeout(playerId: string): boolean {
    return this.activeTimeouts.has(playerId);
  }

  /**
   * Clear all timeouts for a game (called when game ends)
   */
  clearGameTimeouts(gameId: string): void {
    const timeoutsToRemove: string[] = [];

    for (const [playerId, timeout] of this.activeTimeouts.entries()) {
      if (timeout.gameId === gameId) {
        clearTimeout(timeout.timeoutId);
        timeoutsToRemove.push(playerId);
      }
    }

    timeoutsToRemove.forEach(playerId => {
      this.activeTimeouts.delete(playerId);
    });

    console.log(`🧹 Cleared ${timeoutsToRemove.length} timeouts for game ${gameId}`);
  }

  /**
   * Clear all timeouts (for cleanup)
   */
  clearAllTimeouts(): void {
    for (const [playerId, timeout] of this.activeTimeouts.entries()) {
      clearTimeout(timeout.timeoutId);
    }

    this.activeTimeouts.clear();
    console.log('🧹 Cleared all player timeouts');
  }

  /**
   * Get all active timeouts (for debugging)
   */
  getActiveTimeouts(): Map<string, PlayerTimeout> {
    return new Map(this.activeTimeouts);
  }

  /**
   * Get timeout statistics
   */
  getTimeoutStats(): {
    totalActive: number;
    gameBreakdown: { [gameId: string]: number };
  } {
    const stats = {
      totalActive: this.activeTimeouts.size,
      gameBreakdown: {} as { [gameId: string]: number }
    };

    for (const timeout of this.activeTimeouts.values()) {
      stats.gameBreakdown[timeout.gameId] = (stats.gameBreakdown[timeout.gameId] || 0) + 1;
    }

    return stats;
  }
}

export const playerTimeoutService = new PlayerTimeoutService();
export { PlayerTimeoutService }; 