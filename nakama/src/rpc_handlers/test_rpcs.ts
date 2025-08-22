/**
 * Comprehensive Testing RPC Functions for Nakama Backend
 * Ported from backend/src/routes/testRoutes.ts
 * Provides test_ prefixed APIs for BDD testing and validation
 */

interface TestGameRequest {
  tableId: string;
  players: Array<{
    id: string;
    name: string;
    chips: number;
    seat: number;
  }>;
}

interface TestPlayerActionRequest {
  tableId: string;
  playerId: string;
  action: 'call' | 'raise' | 'fold' | 'bet' | 'check' | 'allIn';
  amount?: number;
}

interface TestAdvancePhaseRequest {
  tableId: string;
  targetPhase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
}

interface TestSeatRequest {
  tableId: string;
  playerId: string;
  seatNumber: number;
  buyIn: number;
}

/**
 * Create a mock game for testing purposes
 */
function testCreateMockGameRpc(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  try {
    const request: TestGameRequest = JSON.parse(payload);
    
    // Create a test match for the poker table
    const matchId = nk.matchCreate("poker_table", {
      tableId: request.tableId,
      maxPlayers: 6,
      smallBlind: 5,
      bigBlind: 10,
      minBuyIn: 100,
      maxBuyIn: 1000,
      isTestMode: true
    });

    // Store test game state in storage
    const testGameState = {
      matchId: matchId,
      tableId: request.tableId,
      players: request.players,
      status: 'waiting',
      phase: 'waiting',
      pot: 0,
      currentBet: 0,
      communityCards: [],
      createdAt: new Date().toISOString(),
      isTestGame: true
    };

    nk.storageWrite([{
      collection: "test_games",
      key: request.tableId,
      userId: ctx.userId,
      value: testGameState,
      permissionRead: 2,
      permissionWrite: 1
    }]);

    logger.info(`Test game created: ${request.tableId} with match ID: ${matchId}`);

    return JSON.stringify({
      success: true,
      data: {
        tableId: request.tableId,
        matchId: matchId,
        gameState: testGameState
      }
    });
  } catch (error) {
    logger.error('Test create mock game failed:', error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create test game'
    });
  }
}

/**
 * Get test game state
 */
function testGetMockGameRpc(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  try {
    const { tableId } = JSON.parse(payload);
    
    // Get test game from storage
    const result = nk.storageRead([{
      collection: "test_games",
      key: tableId,
      userId: ctx.userId
    }]);

    if (!result || result.length === 0) {
      throw new Error('Test game not found');
    }

    const gameState = result[0].value;

    return JSON.stringify({
      success: true,
      data: { gameState }
    });
  } catch (error) {
    logger.error('Test get mock game failed:', error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get test game'
    });
  }
}

/**
 * Update test game state
 */
function testUpdateMockGameRpc(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  try {
    const { tableId, updates } = JSON.parse(payload);
    
    // Get current game state
    const result = nk.storageRead([{
      collection: "test_games",
      key: tableId,
      userId: ctx.userId
    }]);

    if (!result || result.length === 0) {
      throw new Error('Test game not found');
    }

    const gameState = result[0].value;
    
    // Apply updates
    Object.assign(gameState, updates);
    gameState.updatedAt = new Date().toISOString();

    // Save updated state
    nk.storageWrite([{
      collection: "test_games",
      key: tableId,
      userId: ctx.userId,
      value: gameState,
      permissionRead: 2,
      permissionWrite: 1
    }]);

    return JSON.stringify({
      success: true,
      data: { gameState }
    });
  } catch (error) {
    logger.error('Test update mock game failed:', error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update test game'
    });
  }
}

/**
 * Simulate player action in test game
 */
function testPlayerActionRpc(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  try {
    const request: TestPlayerActionRequest = JSON.parse(payload);
    
    // Get test game state
    const result = nk.storageRead([{
      collection: "test_games",
      key: request.tableId,
      userId: ctx.userId
    }]);

    if (!result || result.length === 0) {
      throw new Error('Test game not found');
    }

    const gameState = result[0].value;
    
    // Find player
    const player = gameState.players.find((p: any) => p.id === request.playerId);
    if (!player) {
      throw new Error('Player not found in test game');
    }

    // Record action
    const action = {
      playerId: request.playerId,
      playerName: player.name,
      action: request.action,
      amount: request.amount || 0,
      timestamp: new Date().toISOString(),
      phase: gameState.phase
    };

    // Initialize actions array if it doesn't exist
    if (!gameState.actions) {
      gameState.actions = [];
    }
    
    gameState.actions.push(action);

    // Update pot and player chips based on action
    switch (request.action) {
      case 'bet':
      case 'raise':
        if (request.amount) {
          player.chips -= request.amount;
          gameState.pot += request.amount;
          gameState.currentBet = request.amount;
        }
        break;
      case 'call':
        const callAmount = gameState.currentBet - (player.currentBet || 0);
        player.chips -= callAmount;
        gameState.pot += callAmount;
        player.currentBet = gameState.currentBet;
        break;
      case 'allIn':
        gameState.pot += player.chips;
        player.chips = 0;
        break;
      case 'fold':
        player.folded = true;
        break;
      // check requires no action
    }

    // Update last action timestamp
    gameState.lastActionAt = new Date().toISOString();

    // Save updated game state
    nk.storageWrite([{
      collection: "test_games",
      key: request.tableId,
      userId: ctx.userId,
      value: gameState,
      permissionRead: 2,
      permissionWrite: 1
    }]);

    // Log action for testing
    logger.info(`Test action recorded: ${player.name} ${request.action}${request.amount ? ` $${request.amount}` : ''}`);

    return JSON.stringify({
      success: true,
      data: {
        action: action,
        gameState: gameState
      }
    });
  } catch (error) {
    logger.error('Test player action failed:', error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process test action'
    });
  }
}

/**
 * Advance test game to next phase
 */
function testAdvancePhaseRpc(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  try {
    const request: TestAdvancePhaseRequest = JSON.parse(payload);
    
    // Get test game state
    const result = nk.storageRead([{
      collection: "test_games",
      key: request.tableId,
      userId: ctx.userId
    }]);

    if (!result || result.length === 0) {
      throw new Error('Test game not found');
    }

    const gameState = result[0].value;
    
    // Generate community cards based on phase
    switch (request.targetPhase) {
      case 'flop':
        gameState.communityCards = [
          { rank: 'A', suit: '♠' },
          { rank: 'K', suit: '♥' },
          { rank: 'Q', suit: '♦' }
        ];
        break;
      case 'turn':
        if (gameState.communityCards.length === 0) {
          gameState.communityCards = [
            { rank: 'A', suit: '♠' },
            { rank: 'K', suit: '♥' },
            { rank: 'Q', suit: '♦' }
          ];
        }
        gameState.communityCards.push({ rank: 'J', suit: '♣' });
        break;
      case 'river':
        if (gameState.communityCards.length === 0) {
          gameState.communityCards = [
            { rank: 'A', suit: '♠' },
            { rank: 'K', suit: '♥' },
            { rank: 'Q', suit: '♦' },
            { rank: 'J', suit: '♣' }
          ];
        }
        if (gameState.communityCards.length === 4) {
          gameState.communityCards.push({ rank: '10', suit: '♠' });
        }
        break;
    }

    // Update phase
    gameState.phase = request.targetPhase;
    gameState.phaseChangedAt = new Date().toISOString();

    // Reset current bet for new betting round
    if (['flop', 'turn', 'river'].includes(request.targetPhase)) {
      gameState.currentBet = 0;
      gameState.players.forEach((p: any) => {
        p.currentBet = 0;
      });
    }

    // Save updated game state
    nk.storageWrite([{
      collection: "test_games",
      key: request.tableId,
      userId: ctx.userId,
      value: gameState,
      permissionRead: 2,
      permissionWrite: 1
    }]);

    logger.info(`Test game ${request.tableId} advanced to ${request.targetPhase}`);

    return JSON.stringify({
      success: true,
      data: {
        phase: request.targetPhase,
        gameState: gameState
      }
    });
  } catch (error) {
    logger.error('Test advance phase failed:', error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to advance test game phase'
    });
  }
}

/**
 * Seat player in test game
 */
function testTakeSeatRpc(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  try {
    const request: TestSeatRequest = JSON.parse(payload);
    
    // Get test game state
    const result = nk.storageRead([{
      collection: "test_games",
      key: request.tableId,
      userId: ctx.userId
    }]);

    if (!result || result.length === 0) {
      throw new Error('Test game not found');
    }

    const gameState = result[0].value;
    
    // Check if seat is available
    const existingPlayer = gameState.players.find((p: any) => p.seat === request.seatNumber);
    if (existingPlayer && existingPlayer.id !== request.playerId) {
      throw new Error(`Seat ${request.seatNumber} is already taken`);
    }

    // Find or create player
    let player = gameState.players.find((p: any) => p.id === request.playerId);
    if (!player) {
      // Create new player
      player = {
        id: request.playerId,
        name: `Player${request.playerId}`,
        chips: request.buyIn,
        seat: request.seatNumber,
        isActive: true,
        cards: []
      };
      gameState.players.push(player);
    } else {
      // Update existing player
      player.seat = request.seatNumber;
      player.chips = request.buyIn;
      player.isActive = true;
    }

    // Save updated game state
    nk.storageWrite([{
      collection: "test_games",
      key: request.tableId,
      userId: ctx.userId,
      value: gameState,
      permissionRead: 2,
      permissionWrite: 1
    }]);

    logger.info(`Test player ${request.playerId} seated at position ${request.seatNumber}`);

    return JSON.stringify({
      success: true,
      data: {
        player: player,
        gameState: gameState
      }
    });
  } catch (error) {
    logger.error('Test take seat failed:', error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to seat player in test game'
    });
  }
}

/**
 * Start test game
 */
function testStartGameRpc(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  try {
    const { tableId } = JSON.parse(payload);
    
    // Get test game state
    const result = nk.storageRead([{
      collection: "test_games",
      key: tableId,
      userId: ctx.userId
    }]);

    if (!result || result.length === 0) {
      throw new Error('Test game not found');
    }

    const gameState = result[0].value;
    
    // Check minimum players
    const activePlayers = gameState.players.filter((p: any) => p.isActive);
    if (activePlayers.length < 2) {
      throw new Error('Need at least 2 players to start game');
    }

    // Deal hole cards to each player
    const cards = ['A♠', 'K♠', 'Q♠', 'J♠', '10♠', '9♠', '8♠', '7♠', '6♠', '5♠'];
    activePlayers.forEach((player: any, index: number) => {
      player.cards = [
        { rank: cards[index * 2]?.charAt(0) || 'A', suit: cards[index * 2]?.charAt(1) || '♠' },
        { rank: cards[index * 2 + 1]?.charAt(0) || 'K', suit: cards[index * 2 + 1]?.charAt(1) || '♠' }
      ];
    });

    // Set game to playing state
    gameState.status = 'playing';
    gameState.phase = 'preflop';
    gameState.currentPlayerId = activePlayers[0]?.id;
    gameState.startedAt = new Date().toISOString();

    // Initialize blinds
    if (activePlayers.length >= 2) {
      // Small blind
      const sbPlayer = activePlayers[0];
      sbPlayer.chips -= 5;
      sbPlayer.currentBet = 5;
      gameState.pot += 5;

      // Big blind
      const bbPlayer = activePlayers[1];
      bbPlayer.chips -= 10;
      bbPlayer.currentBet = 10;
      gameState.pot += 10;
      gameState.currentBet = 10;
    }

    // Save updated game state
    nk.storageWrite([{
      collection: "test_games",
      key: tableId,
      userId: ctx.userId,
      value: gameState,
      permissionRead: 2,
      permissionWrite: 1
    }]);

    logger.info(`Test game ${tableId} started with ${activePlayers.length} players`);

    return JSON.stringify({
      success: true,
      data: { gameState }
    });
  } catch (error) {
    logger.error('Test start game failed:', error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start test game'
    });
  }
}

/**
 * Cleanup test games
 */
function testCleanupGamesRpc(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  try {
    // List all test games for the user
    const result = nk.storageList(ctx.userId, "test_games", 100);
    
    if (result.objects && result.objects.length > 0) {
      // Delete all test games
      const deleteOps = result.objects.map(obj => ({
        collection: "test_games",
        key: obj.key,
        userId: ctx.userId
      }));

      nk.storageDelete(deleteOps);
      
      logger.info(`Cleaned up ${result.objects.length} test games`);
      
      return JSON.stringify({
        success: true,
        message: `Cleaned up ${result.objects.length} test games`
      });
    } else {
      return JSON.stringify({
        success: true,
        message: 'No test games to cleanup'
      });
    }
  } catch (error) {
    logger.error('Test cleanup games failed:', error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cleanup test games'
    });
  }
}

/**
 * Get test game history/actions
 */
function testGetGameHistoryRpc(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  try {
    const { tableId } = JSON.parse(payload);
    
    // Get test game state
    const result = nk.storageRead([{
      collection: "test_games",
      key: tableId,
      userId: ctx.userId
    }]);

    if (!result || result.length === 0) {
      throw new Error('Test game not found');
    }

    const gameState = result[0].value;
    const actions = gameState.actions || [];

    return JSON.stringify({
      success: true,
      data: {
        actions: actions,
        actionCount: actions.length,
        gameState: {
          tableId: gameState.tableId,
          status: gameState.status,
          phase: gameState.phase,
          pot: gameState.pot
        }
      }
    });
  } catch (error) {
    logger.error('Test get game history failed:', error);
    return JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get test game history'
    });
  }
}

// Export test RPC functions
module.exports = {
  testCreateMockGameRpc,
  testGetMockGameRpc,
  testUpdateMockGameRpc,
  testPlayerActionRpc,
  testAdvancePhaseRpc,
  testTakeSeatRpc,
  testStartGameRpc,
  testCleanupGamesRpc,
  testGetGameHistoryRpc
};
